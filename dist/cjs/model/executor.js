"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../parse/index.js");
const index_js_2 = require("../utils/index.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const parseJoin_js_1 = __importDefault(require("../parse/parseJoin.js"));
class Executor {
    client;
    table;
    schema;
    conn;
    static debug = false;
    constructor(client, table, schema, conn) {
        this.client = client;
        this.table = table;
        this.schema = schema;
        this.conn = conn;
    }
    buildLimit(limit, offset) {
        let limitSql = "";
        if (isFinite(limit) && limit > 0) {
            limitSql = `LIMIT ${Math.round(limit)}`;
            if (isFinite(offset) && offset > 0) {
                limitSql += ` OFFSET ${Math.round(offset)}`;
            }
        }
        return limitSql;
    }
    /** 开启事务 */
    async beginTransaction() {
        if (!this.conn)
            throw new Error("Connection lost");
        await this.conn.beginTransaction();
    }
    /** 提交事务 */
    async commit() {
        if (!this.conn)
            throw new Error("Connection lost");
        await this.conn.commit();
    }
    /** 回滚事务 */
    async rollback() {
        if (!this.conn)
            throw new Error("Connection lost");
        await this.conn.rollback();
    }
    async release() {
        if (!this.conn) {
            console.warn("[Schema Warning] 'release()' called when no connection is available.");
            return;
        }
        // 只有连接池模式才需要 release
        if (this.client.isPool) {
            if (this.conn && this.conn.release) {
                this.conn.release();
                this.conn = undefined; // 💡 防止重复释放（幂等性）
            }
        }
        else {
            // 单连接模式下，用户调用 release 通常是个误操作，或者想关闭连接
            console.warn("[Schema Warning] Single connection mode does not require 'release()'.");
        }
    }
    async execute(joinSql, params) {
        if (Executor.debug) {
            console.log("\n========== SQL DEBUG ==========\n");
            logger_js_1.default.loggerSql(joinSql, params);
            console.log("\n===============================\n");
            const start = performance.now();
            let result;
            if (this.conn) {
                result = await this.client.withConnExecute(this.conn, joinSql, params);
            }
            result = await this.client.execute(joinSql, params);
            const elapsed = (performance.now() - start).toFixed(2);
            console.log(`[SQL ${elapsed}ms]`);
            return result;
        }
        else {
            if (this.conn) {
                return await this.client.withConnExecute(this.conn, joinSql, params);
            }
            return await this.client.execute(joinSql, params);
        }
    }
    async findOne(query, options = {}) {
        if (typeof this.schema.hooks.beforeFind === "function") {
            query = await this.schema.hooks.beforeFind(query) || query;
        }
        const { fields = "*", sort = {} } = options;
        const { fields: bFields, params } = (0, index_js_2.buildFields)(fields);
        const { sql, params: qParams } = (0, index_js_1.parseQuery)(query);
        params.push(...qParams);
        let joinSql = `SELECT ${bFields} FROM ${(0, index_js_2.quote)(this.table)}`;
        if (sql)
            joinSql += ` WHERE ${sql} `;
        joinSql += ` ${(0, index_js_1.parseOrder)(sort, params)} LIMIT 1`;
        const result = await this.execute(joinSql, params);
        if (typeof this.schema.hooks.afterFind === "function") {
            return await this.schema.hooks.afterFind(result[0]);
        }
        return result[0];
    }
    async count(options) {
        const { sql, params } = this.buildMathSql('COUNT', options);
        const result = await this.execute(sql, params);
        return Number(result?.[0]?.total || 0);
    }
    async sum(options) {
        const { sql, params } = this.buildMathSql('SUM', options);
        const result = await this.execute(sql, params);
        return Number(result?.[0]?.total || 0);
    }
    async avg(options) {
        const { sql, params } = this.buildMathSql('AVG', options);
        const result = await this.execute(sql, params);
        return Number(result?.[0]?.total || 0);
    }
    async max(options) {
        const { sql, params } = this.buildMathSql('MAX', options);
        const result = await this.execute(sql, params);
        return Number(result?.[0]?.total || 0);
    }
    async min(options) {
        const { sql, params } = this.buildMathSql('MIN', options);
        const result = await this.execute(sql, params);
        return Number(result?.[0]?.total || 0);
    }
    buildMathSql(mathType, options) {
        let sqlWhere = "";
        let paramsWhere = [];
        const { field = '*', joins = [], distinct } = options;
        if (options.query && Object.keys(options.query).length) {
            const { sql, params } = (0, index_js_1.parseQuery)(options.query);
            sqlWhere = sql;
            paramsWhere = params;
        }
        let expr;
        if (mathType === 'COUNT') {
            if (!options.field) {
                if (distinct) {
                    throw new Error('DISTINCT requires a specific field; COUNT(DISTINCT *) is not supported');
                }
                expr = '*';
            }
            else {
                expr = (0, index_js_2.quote)(field);
                if (distinct) {
                    expr = `DISTINCT ${expr}`;
                }
            }
        }
        else {
            if (!options.field || field === '*') {
                throw new Error(`${mathType} requires a specific field`);
            }
            expr = (0, index_js_2.quote)(field);
            // DISTINCT 对 MAX / MIN 没有实际意义
            if (distinct && mathType !== 'MAX' && mathType !== 'MIN') {
                expr = `DISTINCT ${expr}`;
            }
        }
        let sql = `SELECT ${mathType}(${expr}) AS total FROM ${(0, index_js_2.quote)(this.table)}`;
        if (joins.length) {
            sql += ` ${(0, parseJoin_js_1.default)(joins).joinSql}`;
        }
        if (sqlWhere) {
            sql += ` WHERE ${sqlWhere}`;
        }
        return {
            sql,
            params: paramsWhere
        };
    }
    async findMany(query, options = {}) {
        if (typeof this.schema.hooks.beforeFind === "function") {
            query = await this.schema.hooks.beforeFind(query) || query;
        }
        const { limit = 0, offset = 0, fields = "*", sort = {} } = options;
        const { fields: bFields, params } = (0, index_js_2.buildFields)(fields);
        const { sql, params: qParams } = (0, index_js_1.parseQuery)(query);
        params.push(...qParams);
        let joinSql = `SELECT ${bFields} FROM ${(0, index_js_2.quote)(this.table)}`;
        if (sql)
            joinSql += ` WHERE ${sql} `;
        joinSql += ` ${(0, index_js_1.parseOrder)(sort, params)} ${this.buildLimit(limit, offset)} `;
        const results = await this.execute(joinSql, params);
        if (typeof this.schema.hooks.afterFind === "function") {
            return this.schema.hooks.afterFind(results);
        }
        return results;
    }
    prepareFields(data) {
        const fields = [];
        const params = [];
        for (const key in data) {
            const fieldType = this.schema.fieldsMap.get(key);
            if (!fieldType)
                continue;
            const value = data[key];
            const quotedKey = (0, index_js_2.quote)(key);
            fields.push(quotedKey);
            params.push((0, index_js_2.normalizeSqlValue)(value));
        }
        return { fields, params };
    }
    async insertOne(data, opt = {}) {
        if (typeof this.schema.hooks.beforeInsert === "function") {
            data = await this.schema.hooks.beforeInsert(data) || data;
        }
        const { ignore = false, upsert = false } = opt;
        const { fields: insertFields, params } = this.prepareFields(data);
        let sql = `INSERT ${ignore ? 'IGNORE' : ''} INTO ${(0, index_js_2.quote)(this.table)} (${insertFields.join(', ')}) VALUES (${params.map(() => '?').join(', ')})`;
        // 处理 UPSERT 逻辑
        if (upsert) {
            const updateFields = Array.isArray(upsert)
                ? upsert
                : Object.keys(data).filter(k => this.schema.fieldsMap.has(k));
            const updateSql = updateFields
                .map(f => `${(0, index_js_2.quote)(f)} = VALUES(${(0, index_js_2.quote)(f)})`)
                .join(', ');
            sql += ` ON DUPLICATE KEY UPDATE ${updateSql}`;
        }
        const result = await this.execute(sql, params);
        if (typeof this.schema.hooks.afterInsert === "function") {
            return await this.schema.hooks.afterInsert(result);
        }
        return result;
    }
    async insertMany(data, opt = {}) {
        if (!Array.isArray(data) || data.length === 0)
            throw new Error("[ODM] insertMany data must be an array");
        const batch = [];
        const { ignore = false, upsert = false, useTransaction = false, batchSize = 100 } = opt;
        if (data.length > batchSize) {
            for (let i = 0; i < data.length; i += batchSize) {
                batch.push(data.slice(i, i + 100));
            }
        }
        else {
            batch.push(data);
        }
        const columns = Object.keys(data[0]);
        const quotedColumns = columns.filter(c => this.schema.fieldsMap.has(c)).map(c => (0, index_js_2.quote)(c)).join(', ');
        const results = {
            fieldCount: 0,
            affectedRows: 0,
            insertId: 0,
            info: '',
            serverStatus: 0,
            warningStatus: 0,
            changedRows: 0
        };
        const insert = async () => {
            for (const batchData of batch) {
                // 1. 生成占位符部分，例如 "(?, ?, ?)"
                const placeholders = `(${columns.map(() => '?').join(', ')})`;
                // 2. 重复占位符，生成 "(?, ?), (?, ?), (?, ?)"
                const valuesSql = batchData.map(() => placeholders).join(', ');
                // 3. 展平所有数据为一个一维数组 [val1, val2, val3, val4...]
                const params = batchData.flatMap(item => columns.map(col => (0, index_js_2.normalizeSqlValue)(item[col])));
                let sql = `INSERT ${ignore ? 'IGNORE' : ''} INTO ${(0, index_js_2.quote)(this.table)} (${quotedColumns}) VALUES ${valuesSql}`;
                if (upsert) {
                    const updateFields = Array.isArray(upsert)
                        ? upsert
                        : Object.keys(data).filter(k => this.schema.fieldsMap.has(k));
                    const updateSql = updateFields
                        .map(f => `${(0, index_js_2.quote)(f)} = VALUES(${(0, index_js_2.quote)(f)})`)
                        .join(', ');
                    sql += ` ON DUPLICATE KEY UPDATE ${updateSql}`;
                }
                const result = await this.execute(sql, params);
                results.affectedRows += result.affectedRows;
                results.warningStatus += result.warningStatus;
                results.fieldCount += result.fieldCount;
            }
            results.info = `Records: ${results.affectedRows}  Fields: ${results.fieldCount}  Warnings: ${results.warningStatus}`;
        };
        if (useTransaction) {
            let isTransactionStarted = false;
            try {
                await this.beginTransaction();
                isTransactionStarted = true;
                await insert();
                await this.commit();
            }
            catch (error) {
                if (isTransactionStarted)
                    await this.rollback().catch(() => { });
                throw error;
            }
        }
        else {
            await insert();
        }
        return results;
    }
    async updateOne(query, data) {
        if (typeof this.schema.hooks.beforeUpdate === "function") {
            const result = await this.schema.hooks.beforeUpdate(query, data) || [query, data];
            query = result[0];
            data = result[1];
        }
        const { sql: whereSql, params: whereParams } = (0, index_js_1.parseQuery)(query);
        const { sql: assignments, params: values } = (0, index_js_1.parseUpdate)(data, this.schema);
        const finalSql = `
            UPDATE ${(0, index_js_2.quote)(this.table)}
            SET ${assignments} 
            WHERE ${whereSql} LIMIT 1
        `;
        const result = await this.execute(finalSql, [...values, ...whereParams]);
        if (typeof this.schema.hooks.afterUpdate === "function") {
            return await this.schema.hooks.afterUpdate(result);
        }
        return result;
    }
    async updateMany(query, data) {
        if (typeof this.schema.hooks.beforeUpdate === "function") {
            const result = await this.schema.hooks.beforeUpdate(query, data) || [query, data];
            query = result[0];
            data = result[1];
        }
        const { sql: whereSql, params: whereParams } = (0, index_js_1.parseQuery)(query);
        const { sql: assignments, params: values } = (0, index_js_1.parseUpdate)(data, this.schema);
        const finalSql = `
            UPDATE ${(0, index_js_2.quote)(this.table)}
            SET ${assignments} 
            WHERE ${whereSql}
        `;
        const result = await this.execute(finalSql, [...values, ...whereParams]);
        if (typeof this.schema.hooks.afterUpdate === "function") {
            return await this.schema.hooks.afterUpdate(result);
        }
        return result;
    }
    async deleteOne(query) {
        if (typeof this.schema.hooks.beforeDelete === "function") {
            query = await this.schema.hooks.beforeDelete(query) || query;
        }
        const { sql: whereSql, params: whereParams } = (0, index_js_1.parseQuery)(query);
        const finalSql = `DELETE FROM ${(0, index_js_2.quote)(this.table)} WHERE ${whereSql} LIMIT 1`;
        const result = await this.execute(finalSql, whereParams);
        if (typeof this.schema.hooks.afterDelete === "function") {
            return await this.schema.hooks.afterDelete(result);
        }
        return result;
    }
    async deleteMany(query) {
        if (typeof this.schema.hooks.beforeDelete === "function") {
            query = await this.schema.hooks.beforeDelete(query) || query;
        }
        const { sql: whereSql, params: whereParams } = (0, index_js_1.parseQuery)(query);
        const finalSql = `DELETE FROM ${(0, index_js_2.quote)(this.table)} WHERE ${whereSql}`;
        const result = await this.execute(finalSql, whereParams);
        if (typeof this.schema.hooks.afterDelete === "function") {
            return await this.schema.hooks.afterDelete(result);
        }
        return result;
    }
    async clear() {
        const finalSql = `DELETE FROM ${(0, index_js_2.quote)(this.table)}`;
        const result = await this.execute(finalSql, []);
        return result;
    }
    async aggregate(options) {
        if (typeof this.schema.hooks.beforeAggregate === "function") {
            options = await this.schema.hooks.beforeAggregate(options) || options;
        }
        const { sql, params } = (0, index_js_1.parseAggregate)(this.table, options);
        const finalSql = `SELECT ${sql}`;
        const result = await this.execute(finalSql, params);
        if (typeof this.schema.hooks.AFterAggregate === "function") {
            return await this.schema.hooks.AFterAggregate(result);
        }
        return result;
    }
}
exports.default = Executor;
