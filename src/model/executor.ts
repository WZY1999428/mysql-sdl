import { parseOrder, parseQuery, parseUpdate, parseAggregate } from "../parse/index.js";
import type { Query, AggregationOptions, mathType } from "../parse/operators/index.js"
import type {
    FindOptions, FindOneOptions, InsertOptions, UpdateOptions,
    insertManyOptions, MathOptions
} from "./options.js"
import Client, { newConnection, } from "../client.js";
import { Schema } from "../schema/index.js";
import { quote, buildFields, normalizeSqlValue, Snowflake } from "../utils/index.js";
import debug from "../utils/logger.js";
import parseJoin from "../parse/parseJoin.js"
import { ResultSetHeader } from "mysql2";


class Executor<T> {
    static logger: boolean = false
    constructor(
        private client: Client,
        private table: string,
        private schema: Schema<T>,
        public conn?: newConnection,
    ) {

    }



    private buildLimit(limit: number, offset: number): string {
        let limitSql = "";
        if (isFinite(limit) && limit > 0) {
            limitSql = `LIMIT ${Math.round(limit)}`;
            if (isFinite(offset) && offset > 0) {
                limitSql += ` OFFSET ${Math.round(offset)}`;
            }
        }
        return limitSql
    }



    /** 开启事务 */
    async beginTransaction() {
        if (!this.conn) throw new Error("Connection lost");
        await this.conn.beginTransaction();
    }

    /** 提交事务 */
    async commit() {
        if (!this.conn) throw new Error("Connection lost");
        await this.conn.commit();
    }

    /** 回滚事务 */
    async rollback() {
        if (!this.conn) throw new Error("Connection lost");
        await this.conn.rollback();
    }


    async release() {
        if (!this.conn) {
            console.warn("[Schema Warning] 'release()' called when no connection is available.");
            return
        }
        // 只有连接池模式才需要 release
        if (this.client.isPool) {
            if (this.conn && (this.conn as any).release) {
                (this.conn as any).release();
                this.conn = undefined; // 💡 防止重复释放（幂等性）
            }
        } else {
            // 单连接模式下，用户调用 release 通常是个误操作，或者想关闭连接
            console.warn("[Schema Warning] Single connection mode does not require 'release()'.");
        }
    }

    // async execute(joinSql: string, params: any[]) {
    //     if (Executor.logger) {
    //         console.log("\n========== SQL DEBUG ==========\n");
    //         debug.loggerSql(joinSql, params);
    //         console.log("\n===============================\n");
    //         const start = performance.now();
    //         let result
    //         if (this.conn) {
    //             result = await this.client.withConnExecute(this.conn, joinSql, params);
    //         }
    //         result = await this.client.execute(joinSql, params);
    //         const elapsed = (performance.now() - start).toFixed(2);
    //         console.log(`[SQL ${elapsed}ms]`);
    //         return result;
    //     } else {
    //         if (this.conn) {
    //             return await this.client.withConnExecute(this.conn, joinSql, params);
    //         }
    //         return await this.client.execute(joinSql, params);
    //     }
    // }

    async execute(joinSql: string, params: any[]) {

        if (Executor.logger) {
            console.log("\n========== SQL DEBUG ==========\n");
            debug.loggerSql(joinSql, params);
            console.log("\n===============================\n");
        }
        let result;
        const start = performance.now();
        if (this.conn) {
            result = await this.client.withConnExecute(
                this.conn,
                joinSql,
                params
            );
        } else {
            result = await this.client.execute(joinSql, params);
        }

        if (Executor.logger) {
            const elapsed = (performance.now() - start).toFixed(2);
            console.log(`[SQL ${elapsed}ms]`);
        }


        return result;
    }



    async findOne<T>(query: Query<T>, options: FindOneOptions<T> = {}) {
        if (typeof this.schema.hooks.beforeFind === "function") {
            query = await this.schema.hooks.beforeFind(query) || query;
        }
        const { fields = "*", sort = {} } = options;
        const { fields: bFields, params } = buildFields(fields)
        const { sql, params: qParams } = parseQuery(query);
        params.push(...qParams)
        let joinSql = `SELECT ${bFields} FROM ${quote(this.table)}`;
        if (sql) joinSql += ` WHERE ${sql} `;
        joinSql += ` ${parseOrder(sort, params)} LIMIT 1`;
        const result = await this.execute(joinSql, params) as T[];

        if (typeof this.schema.hooks.afterFind === "function") {
            return await this.schema.hooks.afterFind(result[0] as any);
        }
        return result[0];
    }


    async count<T>(options: MathOptions<T>): Promise<number> {
        const { sql, params } = this.buildMathSql('COUNT', options);

        const result: any = await this.execute(sql, params)
        return Number(result?.[0]?.total || 0);
    }


    async sum<T>(options: MathOptions<T>): Promise<number> {
        const { sql, params } = this.buildMathSql('SUM', options);
        const result: any = await this.execute(sql, params)
        return Number(result?.[0]?.total || 0);
    }

    async avg<T>(options: MathOptions<T>): Promise<number> {
        const { sql, params } = this.buildMathSql('AVG', options);
        const result: any = await this.execute(sql, params)
        return Number(result?.[0]?.total || 0);
    }

    async max<T>(options: MathOptions<T>): Promise<number> {
        const { sql, params } = this.buildMathSql('MAX', options);
        const result: any = await this.execute(sql, params)
        return Number(result?.[0]?.total || 0);
    }

    async min<T>(options: MathOptions<T>): Promise<number> {
        const { sql, params } = this.buildMathSql('MIN', options);
        const result: any = await this.execute(sql, params)
        return Number(result?.[0]?.total || 0);
    }

    private buildMathSql<T>(
        mathType: mathType,
        options: MathOptions<T>
    ): { sql: string; params: any[] } {

        let sqlWhere = "";
        let paramsWhere: any[] = [];

        const {
            field = '*',
            joins = [],
            distinct
        } = options;

        if (options.query && Object.keys(options.query).length) {
            const { sql, params } = parseQuery(options.query);
            sqlWhere = sql;
            paramsWhere = params;
        }

        let expr: string;

        if (mathType === 'COUNT') {
            if (!options.field) {
                if (distinct) {
                    throw new Error(
                        'DISTINCT requires a specific field; COUNT(DISTINCT *) is not supported'
                    );
                }

                expr = '*';
            } else {
                expr = quote(field);

                if (distinct) {
                    expr = `DISTINCT ${expr}`;
                }
            }
        } else {
            if (!options.field || field === '*') {
                throw new Error(`${mathType} requires a specific field`);
            }

            expr = quote(field);

            // DISTINCT 对 MAX / MIN 没有实际意义
            if (distinct && mathType !== 'MAX' && mathType !== 'MIN') {
                expr = `DISTINCT ${expr}`;
            }
        }

        let sql = `SELECT ${mathType}(${expr}) AS total FROM ${quote(this.table)}`;
        if (joins.length) {
            const { joinSql, params } = parseJoin(joins);
            sql += ` ${joinSql}`;
            paramsWhere.unshift(...params)
        }
        if (sqlWhere) {
            sql += ` WHERE ${sqlWhere}`;
        }

        return {
            sql,
            params: paramsWhere
        };
    }



    async findMany<T>(query: Query<T>, options: FindOptions<T> = {}) {
        if (typeof this.schema.hooks.beforeFind === "function") {
            query = await this.schema.hooks.beforeFind(query) || query;
        }

        const { limit = 0, offset = 0, fields = "*", sort = {} } = options;

        const { fields: bFields, params } = buildFields(fields)
        const { sql, params: qParams } = parseQuery(query);
        params.push(...qParams)
        let joinSql = `SELECT ${bFields} FROM ${quote(this.table)}`;
        if (sql) joinSql += ` WHERE ${sql} `;
        joinSql += ` ${parseOrder(sort, params)} ${this.buildLimit(limit, offset)} `;
        const results = await this.execute(joinSql, params);
        if (typeof this.schema.hooks.afterFind === "function") {
            return this.schema.hooks.afterFind(results as any[]);
        }
        return results;
    }




    private prepareFields<T>(data: Partial<T>) {
        const fields: string[] = [];
        const params: any[] = [];

        for (const key in data) {
            const fieldType = this.schema.fieldsMap.get(key);
            if (!fieldType) continue;

            const value = data[key];
            const quotedKey = quote(key);
            fields.push(quotedKey);
            params.push(normalizeSqlValue(value));
        }

        return { fields, params };
    }

    private generateSnowflakeIds(data: Record<string, any>) {
        for (const key of this.schema.snowflakeSet) {
            if (data[key] === null || data[key] === undefined) {
                data[key] = this.client.snowflake.nextId() as any;
            }
        }
        return data;
    }

    async insertOne(data: T, opt: InsertOptions = {}) {

        this.generateSnowflakeIds(data as Record<string, any>)

        if (typeof this.schema.hooks.beforeInsert === "function") {
            data = await this.schema.hooks.beforeInsert(data) || data;
        }


        const { ignore = false, upsert = false } = opt;
        const { fields: insertFields, params } = this.prepareFields(data as Partial<T>);
        let sql = `INSERT ${ignore ? 'IGNORE' : ''} INTO ${quote(this.table)} (${insertFields.join(', ')}) VALUES (${params.map(() => '?').join(', ')})`;
        // 处理 UPSERT 逻辑
        if (upsert) {
            const updateFields = Array.isArray(upsert)
                ? upsert
                : Object.keys(data as Record<string, any>).filter(k => this.schema.fieldsMap.has(k));
            const updateSql = updateFields
                .map(f => `${quote(f)} = VALUES(${quote(f)})`)
                .join(', ');

            sql += ` ON DUPLICATE KEY UPDATE ${updateSql}`;
        }
        const result = await this.execute(sql, params);
        if (typeof this.schema.hooks.afterInsert === "function") {
            return await this.schema.hooks.afterInsert(result as any);
        }
        return { ...result, insertData: data }
    }


    async insertMany<T>(data: T[], opt: insertManyOptions = {}) {
        if (!Array.isArray(data) || data.length === 0) throw new Error("[ODM] insertMany data must be an array");
        const batch: T[][] = []
        const { ignore = false, upsert = false, batchSize = 100 } = opt;
        data.forEach(element => this.generateSnowflakeIds(element as Record<string, any>));
        if (data.length > batchSize) {
            for (let i = 0; i < data.length; i += batchSize) {
                batch.push(data.slice(i, i + 100))
            }
        } else {
            batch.push(data)
        }
        const columns = Object.keys(data[0]!);
        const quotedColumns = columns.filter(c => this.schema.fieldsMap.has(c)).map(c => quote(c)).join(', ');
        const results = {
            fieldCount: 0,
            affectedRows: 0,
            insertId: 0,
            info: '',
            serverStatus: 0,
            warningStatus: 0,
            changedRows: 0,
        } as ResultSetHeader;
        const insert = async () => {
            for (const batchData of batch) {
                // 1. 生成占位符部分，例如 "(?, ?, ?)"
                const placeholders = `(${columns.map(() => '?').join(', ')})`;
                // 2. 重复占位符，生成 "(?, ?), (?, ?), (?, ?)"
                const valuesSql = batchData.map(() => placeholders).join(', ');
                // 3. 展平所有数据为一个一维数组 [val1, val2, val3, val4...]
                const params = batchData.flatMap(item => columns.map(col => normalizeSqlValue((item as any)[col])));
                let sql = `INSERT ${ignore ? 'IGNORE' : ''} INTO ${quote(this.table)} (${quotedColumns}) VALUES ${valuesSql}`;
                if (upsert) {
                    const updateFields = Array.isArray(upsert)
                        ? upsert
                        : Object.keys(data as Record<string, any>).filter(k => this.schema.fieldsMap.has(k));
                    const updateSql = updateFields
                        .map(f => `${quote(f)} = VALUES(${quote(f)})`)
                        .join(', ');
                    sql += ` ON DUPLICATE KEY UPDATE ${updateSql}`;
                }
                const result: any = await this.execute(sql, params);
                results.affectedRows += result.affectedRows;
                results.warningStatus += result.warningStatus;
                results.fieldCount += result.fieldCount;

            }
            results.info = `Records: ${results.affectedRows}  Fields: ${results.fieldCount}  Warnings: ${results.warningStatus}`
        }
        await insert();
        return { ...results, insertDatas: data } as ResultSetHeader
    }


    async updateOne(query: Query<T>, data: Partial<T>): Promise<ResultSetHeader> {
        if (typeof this.schema.hooks.beforeUpdate === "function") {
            const result = await this.schema.hooks.beforeUpdate(query, data) || [query, data]
            query = result[0]
            data = result[1]
        }
        const { sql: whereSql, params: whereParams } = parseQuery(query);
        const { sql: assignments, params: values } = parseUpdate(data, this.schema);
        const finalSql = `
            UPDATE ${quote(this.table)}
            SET ${assignments} 
            WHERE ${whereSql} LIMIT 1
        `;
        const result = await this.execute(finalSql, [...values, ...whereParams]);
        if (typeof this.schema.hooks.afterUpdate === "function") {
            return await this.schema.hooks.afterUpdate(result as any);
        }
        return result as ResultSetHeader
    }


    async updateMany(
        query: Query<T>,
        data: Partial<T>,
        options: UpdateOptions = {}
    ) {
        if (typeof this.schema.hooks.beforeUpdate === "function") {
            const result = await this.schema.hooks.beforeUpdate(query, data) || [query, data];
            query = result[0];
            data = result[1];
        }

        const { limit = 0, offset = 0, sort = {} } = options;

        // 分页参数校验
        if (!Number.isInteger(limit) || limit < 0) {
            throw new Error("limit must be a non-negative integer");
        }

        if (!Number.isInteger(offset) || offset < 0) {
            throw new Error("offset must be a non-negative integer");
        }

        // 排序 SQL
        const sortEntries = Object.entries(sort);

        const orderBySql = sortEntries.length
            ? `ORDER BY ${sortEntries.map(([field, direction]) => {
                const order = String(direction).toUpperCase();

                if (order !== "ASC" && order !== "DESC") {
                    throw new Error(`Invalid sort direction: ${direction}`);
                }

                return `${quote(field)} ${order}`;
            }).join(", ")}`
            : "";

        const { sql: whereSql, params: whereParams } = parseQuery(query);
        const { sql: assignments, params: values } = parseUpdate(data, this.schema);

        let finalSql: string;
        // OFFSET 需要通过子查询实现
        if (offset > 0) {
            const primaryKey = quote("id");
            const pageLimit = limit > 0
                ? `LIMIT ${limit}`
                : "LIMIT 18446744073709551615";

            finalSql = `
            UPDATE ${quote(this.table)}
            SET ${assignments}
            WHERE ${primaryKey} IN (
                SELECT ${primaryKey}
                FROM (
                    SELECT ${primaryKey}
                    FROM ${quote(this.table)}
                    WHERE ${whereSql}
                    ${orderBySql}
                    ${pageLimit} OFFSET ${offset}
                ) AS _update_targets
            )
        `;
        } else {
            // 普通更新，支持 ORDER BY 和 LIMIT
            finalSql = `
            UPDATE ${quote(this.table)}
            SET ${assignments}
            WHERE ${whereSql}
            ${orderBySql}
            ${limit > 0 ? `LIMIT ${limit}` : ""}
        `;
        }

        const result = await this.execute(finalSql, [...values, ...whereParams]);

        if (typeof this.schema.hooks.afterUpdate === "function") {
            return await this.schema.hooks.afterUpdate(result as any);
        }

        return result as ResultSetHeader;
    }


    async updateBatch(
        batchList: Array<{ query: Query<T>, data: Partial<T> }>,
    ): Promise<ResultSetHeader> {
        if (!batchList.length) {
            throw new Error("updateBatch requires at least one item.");
        }

        if (typeof this.schema.hooks.beforeUpdateBatch === "function") {
            batchList = await this.schema.hooks.beforeUpdateBatch(batchList) || batchList
        }


        // 解析所有查询条件
        const batch = batchList.map(item => ({
            query: parseQuery(item.query),
            data: item.data
        }));

        // 收集所有需要更新的字段
        const fields = [
            ...new Set(
                batch.flatMap(item => Object.keys(item.data))
            )
        ];

        if (!fields.length) {
            throw new Error("updateBatch requires at least one update field.");
        }

        const params: any[] = [];

        // 构建 SET
        const sets = fields.map((field: string) => {

            const cases = batch
                .filter(item => Object.hasOwn(item.data, field))
                .map(item => {

                    // CASE WHEN 查询条件参数
                    params.push(...item.query.params);

                    // THEN 更新值
                    params.push(item.data[field as keyof T]);

                    return `WHEN (${item.query.sql}) THEN ?`;
                });

            return `${quote(field)} = CASE
            ${cases.join("\n")}
            ELSE ${quote(field)}
        END`;
        });

        // 构建 WHERE
        const where = batch.map(item => {
            params.push(...item.query.params);
            return `(${item.query.sql})`;
        });

        // 拼接 SQL
        const updateBatchSql = `
        UPDATE ${this.table}
        SET ${sets.join(", ")}
        WHERE ${where.join(" OR ")}
    `;

        // 执行 SQL（替换成你 updateOne 使用的执行方法）
        const result = await this.execute(updateBatchSql, params);

        if (typeof this.schema.hooks.afterUpdateBatch === "function") {
            return await this.schema.hooks.afterUpdateBatch(result as any);
        }

        return result as ResultSetHeader;
    }

    async deleteOne(query: Query<T>) {
        if (typeof this.schema.hooks.beforeDelete === "function") {
            query = await this.schema.hooks.beforeDelete(query) || query;
        }
        const { sql: whereSql, params: whereParams } = parseQuery(query);
        const finalSql = `DELETE FROM ${quote(this.table)} WHERE ${whereSql} LIMIT 1`;
        const result = await this.execute(finalSql, whereParams);
        if (typeof this.schema.hooks.afterDelete === "function") {
            return await this.schema.hooks.afterDelete(result as any);
        }
        return result as ResultSetHeader;
    }

    async deleteMany<T>(query: Query<T>): Promise<ResultSetHeader> {
        if (typeof this.schema.hooks.beforeDelete === "function") {
            query = await this.schema.hooks.beforeDelete(query) || query;
        }
        const { sql: whereSql, params: whereParams } = parseQuery(query);
        const finalSql = `DELETE FROM ${quote(this.table)} WHERE ${whereSql}`;
        const result = await this.execute(finalSql, whereParams);
        if (typeof this.schema.hooks.afterDelete === "function") {
            return await this.schema.hooks.afterDelete(result as any);
        }
        return result as ResultSetHeader;
    }

    async clear(): Promise<ResultSetHeader> {
        const finalSql = `DELETE FROM ${quote(this.table)}`;
        const result = await this.execute(finalSql, []);
        return result as ResultSetHeader;
    }

    async aggregate<P>(options: AggregationOptions<T>): Promise<P[]> {
        if (typeof this.schema.hooks.beforeAggregate === "function") {
            options = await this.schema.hooks.beforeAggregate(options) || options;
        }
        const { sql, params } = parseAggregate(this.table, options);
        const finalSql = `SELECT ${sql}`;
        const result = await this.execute(finalSql, params);
        if (typeof this.schema.hooks.AFterAggregate === "function") {
            return await this.schema.hooks.AFterAggregate(result);
        }
        return result as P[];
    }



}

export default Executor;