import { parseOrder, parseQuery, parseUpdate, parseAggregate } from "../parse/index.js";
import type { Query, AggregationOptions, mathType } from "../parse/operators/index.js"
import type { FindOptions, FindOneOptions, InsertOptions, insertManyOptions, MathOptions } from "./options.js"
import { newConnection, } from "../client.js";
import { Schema, DataType } from "../schema/index.js";
import Client from "../client.js";
import { quote, buildFields, normalizeSqlValue } from "../utils/index.js";
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

    async execute(joinSql: string, params: any[]) {
        if (Executor.logger) {
            console.log("\n========== SQL DEBUG ==========\n");
            debug.loggerSql(joinSql, params);
            console.log("\n===============================\n");
            const start = performance.now();
            let result
            if (this.conn) {
                result = await this.client.withConnExecute(this.conn, joinSql, params);
            }
            result = await this.client.execute(joinSql, params);
            const elapsed = (performance.now() - start).toFixed(2);
            console.log(`[SQL ${elapsed}ms]`);
            return result;
        } else {
            if (this.conn) {
                return await this.client.withConnExecute(this.conn, joinSql, params);
            }
            return await this.client.execute(joinSql, params);
        }
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
            sql += ` ${parseJoin(joins).joinSql}`;
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

    async insertOne(data: T, opt: InsertOptions = {}) {
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
        return result
    }


    async insertMany<T>(data: T[], opt: insertManyOptions = {}) {
        if (!Array.isArray(data) || data.length === 0) throw new Error("[ODM] insertMany data must be an array");
        const batch: T[][] = []
        const { ignore = false, upsert = false, useTransaction = false, batchSize = 100 } = opt;
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
            changedRows: 0
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
        if (useTransaction) {
            let isTransactionStarted = false;
            try {
                await this.beginTransaction();
                isTransactionStarted = true;
                await insert();
                await this.commit();
            } catch (error) {
                if (isTransactionStarted) await this.rollback().catch(() => { });
                throw error
            }
        } else {
            await insert();
        }
        return results as ResultSetHeader
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


    async updateMany(query: Query<T>, data: Partial<T>) {
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
            WHERE ${whereSql}
        `;

        const result = await this.execute(finalSql, [...values, ...whereParams]);
        if (typeof this.schema.hooks.afterUpdate === "function") {
            return await this.schema.hooks.afterUpdate(result as any);
        }
        return result as ResultSetHeader
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