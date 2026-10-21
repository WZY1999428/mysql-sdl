import Cleint from "../client.js";
import Executor from "./executor.js";
import { Schema } from "../schema/index.js";
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Query } from "../parse/operators/index.js"
import type { FindOptions, FindOneOptions, InsertOptions, insertManyOptions, AggregationOptions, MathOptions } from "./options.js"
import { ResultSetHeader } from "mysql2"
import type { newConnection } from "../client.js";
const transactionContext = new AsyncLocalStorage<newConnection>();
class Model<T> {
    ready: Promise<void>
    static logger: boolean = false
    constructor(
        public table: string,
        public schema: Schema<T>,
        public client: Cleint,
    ) {
        Executor.logger = Model.logger;
        this.ready = this.createTable();
    };


    private async createTable() {
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
        } catch (err) {
            console.error(`[ODM] Failed to create table "${this.table}":`, err);
            throw err;
        }
    }

    private buildExecutor() {
        return new Executor(this.client, this.table, this.schema)
    }

    findMany(query?: Query<T>, options: FindOptions<T> = {}) {
        return this.buildExecutor().findMany(query || {}, options);
    }

    findOne(query?: Query<T>, options: FindOneOptions<T> = {}) {
        return this.buildExecutor().findOne(query || {}, options);
    }


    deleteOne(query?: Query<T>) {
        return this.buildExecutor().deleteOne(query || {});
    }


    deleteMany(query?: Query<T>) {
        return this.buildExecutor().deleteMany(query || {});
    }

    insertOne(data: T, opt?: InsertOptions) {
        return this.buildExecutor().insertOne(data, opt);
    }

    async insertMany(data: T[], opt?: insertManyOptions) {
        if (!Array.isArray(data)) throw new Error("[ODM] insertMany data must be an array");
        const execute = new Executor(this.client, this.table, this.schema, opt?.useTransaction ? await this.client.getConnection() : undefined)
        return execute.insertMany(data, opt);
    }

    updateOne(query: Query<T>, data: Partial<T & any>): Promise<ResultSetHeader> {
        return this.buildExecutor().updateOne(query, data);
    }



    updateMany(query: Query<T>, data: Partial<T>): Promise<ResultSetHeader> {
        return this.buildExecutor().updateMany(query, data);
    }


    aggregate(options: AggregationOptions<T>) {
        return this.buildExecutor().aggregate(options);
    }


    count<T>(options: MathOptions<T>): Promise<number> {
        return this.buildExecutor().count(options);
    }

    sum<T>(options: MathOptions<T>): Promise<number> {
        return this.buildExecutor().sum(options);
    }

    avg(options?: MathOptions<T>) {
        return this.buildExecutor().avg(options || {});
    }

    max(options?: MathOptions<T>) {
        return this.buildExecutor().max(options || {});
    }

    min(options?: MathOptions<T>) {
        return this.buildExecutor().min(options || {});
    }

    clear() {
        return this.buildExecutor().clear();
    }

    execute(sql: string, params: any[]) {
        return this.buildExecutor().execute(sql, params);
    }

    /**
    *推荐当前使用连接池时使用
    * 从连接池借出一个绑定的执行器。
    * 注意：使用完毕后必须手动调用 executor.release() 归还连接。
    */
    async checkout(): Promise<Executor<T>> {
        const transactionConn = transactionContext.getStore();
        if (transactionConn) {
            // 绑定当前事务连接，不拥有该连接
            return new Executor(
                this.client,
                this.table,
                this.schema,
                transactionConn,
            );
        }

        const conn = await this.client.getConnection();
        if (!conn) throw new Error("[ODM] Failed to get database connection");
        // 这里的第四个参数 release 传 false，表示 executor 执行方法后不自动释放
        return new Executor(this.client, this.table, this.schema, conn!);
    }


    /**
     * 自动事务包装器
     * 逻辑：获取连接 -> 开启事务 -> 执行回调 -> 提交 -> 释放
     * 报错：自动回滚 -> 抛出错误 -> 释放
     */
    async withTransaction<P = any>(callback: (model: Executor<T>) => Promise<P>): Promise<P> {
        const execute = await this.checkout();
        let startd = false;
        try {
            await execute.beginTransaction();
            startd = true;
            const result = await transactionContext.run(
                execute.conn!!,
                () => callback(execute)
            );
            await execute.commit();
            return result;
        } catch (error) {
            if (startd) await execute.rollback().catch(() => { });
            throw error;
        } finally {
            // 只有是连接池时才需要 release
            if (this.client.isPool) {
                execute.release();
            }
        }
    }

    async withPollConnection<P = any>(callback: (model: Executor<T>) => Promise<P>): Promise<P> {
        const execute = await this.checkout();
        try {
            return await callback(execute);
        } finally {
            // 只有是连接池时才需要 release
            if (this.client.isPool) {
                execute.release();
            }
        }
    }

    // 字段相关

    qualifyField(fieldName: string): string {
        return this.schema.qualifyField(fieldName);
    }
    qualifyFields(fieldNames?: string[]): string[] {
        return this.schema.qualifyFields(fieldNames);
    }
}




export default Model