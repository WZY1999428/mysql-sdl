"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const executor_js_1 = __importDefault(require("./executor.js"));
const node_async_hooks_1 = require("node:async_hooks");
const transactionContext = new node_async_hooks_1.AsyncLocalStorage();
class Model {
    table;
    schema;
    client;
    ready;
    static debug = false;
    constructor(table, schema, client) {
        this.table = table;
        this.schema = schema;
        this.client = client;
        executor_js_1.default.debug = Model.debug;
        this.ready = this.createTable();
    }
    ;
    async createTable() {
        const definition = this.schema.toTableDefinition();
        const sql = `
        CREATE TABLE IF NOT EXISTS \`${this.table}\` (
            ${definition.definition}
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
        try {
            await this.client.execute(sql);
            if (definition.alterTable) {
                await this.client.execute(definition.alterTable);
            }
        }
        catch (err) {
            console.error(`[ODM] Failed to create table "${this.table}":`, err);
            throw err;
        }
    }
    buildExecutor() {
        return new executor_js_1.default(this.client, this.table, this.schema);
    }
    findMany(query, options = {}) {
        return this.buildExecutor().findMany(query || {}, options);
    }
    findOne(query, options = {}) {
        return this.buildExecutor().findOne(query || {}, options);
    }
    deleteOne(query) {
        return this.buildExecutor().deleteOne(query || {});
    }
    deleteMany(query) {
        return this.buildExecutor().deleteMany(query || {});
    }
    insertOne(data, opt) {
        return this.buildExecutor().insertOne(data, opt);
    }
    async insertMany(data, opt) {
        if (!Array.isArray(data))
            throw new Error("[ODM] insertMany data must be an array");
        const execute = new executor_js_1.default(this.client, this.table, this.schema, opt?.useTransaction ? await this.client.getConnection() : undefined);
        return execute.insertMany(data, opt);
    }
    updateOne(query, data) {
        return this.buildExecutor().updateOne(query, data);
    }
    updateMany(query, data) {
        return this.buildExecutor().updateMany(query, data);
    }
    aggregate(options) {
        return this.buildExecutor().aggregate(options);
    }
    count(options) {
        return this.buildExecutor().count(options);
    }
    sum(options) {
        return this.buildExecutor().sum(options);
    }
    avg(options) {
        return this.buildExecutor().avg(options || {});
    }
    max(options) {
        return this.buildExecutor().max(options || {});
    }
    min(options) {
        return this.buildExecutor().min(options || {});
    }
    clear() {
        return this.buildExecutor().clear();
    }
    execute(sql, params) {
        return this.buildExecutor().execute(sql, params);
    }
    /**
    *推荐当前使用连接池时使用
    * 从连接池借出一个绑定的执行器。
    * 注意：使用完毕后必须手动调用 executor.release() 归还连接。
    */
    async checkout() {
        const transactionConn = transactionContext.getStore();
        if (transactionConn) {
            // 绑定当前事务连接，不拥有该连接
            return new executor_js_1.default(this.client, this.table, this.schema, transactionConn);
        }
        const conn = await this.client.getConnection();
        if (!conn)
            throw new Error("[ODM] Failed to get database connection");
        // 这里的第四个参数 release 传 false，表示 executor 执行方法后不自动释放
        return new executor_js_1.default(this.client, this.table, this.schema, conn);
    }
    /**
     * 自动事务包装器
     * 逻辑：获取连接 -> 开启事务 -> 执行回调 -> 提交 -> 释放
     * 报错：自动回滚 -> 抛出错误 -> 释放
     */
    async withTransaction(callback) {
        const execute = await this.checkout();
        let startd = false;
        try {
            await execute.beginTransaction();
            startd = true;
            const result = await transactionContext.run(execute.conn, () => callback(execute));
            await execute.commit();
            return result;
        }
        catch (error) {
            if (startd)
                await execute.rollback().catch(() => { });
            throw error;
        }
        finally {
            // 只有是连接池时才需要 release
            if (this.client.isPool) {
                execute.release();
            }
        }
    }
    async withPollConnection(callback) {
        const execute = await this.checkout();
        try {
            return await callback(execute);
        }
        finally {
            // 只有是连接池时才需要 release
            if (this.client.isPool) {
                execute.release();
            }
        }
    }
    // 字段相关
    qualifyField(fieldName) {
        return this.schema.qualifyField(fieldName);
    }
    qualifyFields(fieldNames) {
        return this.schema.qualifyFields(fieldNames);
    }
}
exports.default = Model;
