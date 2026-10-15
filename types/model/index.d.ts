import Cleint from "../client.js";
import Executor from "./executor.js";
import { Schema } from "../schema/index.js";
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Query } from "../parse/operators/index.js";
import type { FindOptions, FindOneOptions, InsertOptions, insertManyOptions, AggregationOptions, MathOptions } from "./options.js";
import { ResultSetHeader } from "mysql2";
import type { newConnection } from "../client.js";
export declare const transactionContext: AsyncLocalStorage<newConnection>;
declare class Model<T> {
    table: string;
    schema: Schema<T>;
    client: Cleint;
    ready: Promise<void>;
    static debug: boolean;
    constructor(table: string, schema: Schema<T>, client: Cleint);
    private createTable;
    private buildExecutor;
    findMany(query?: Query<T>, options?: FindOptions<T>): Promise<import("mysql2").OkPacket | ResultSetHeader | ResultSetHeader[] | import("mysql2").RowDataPacket[] | import("mysql2").RowDataPacket[][] | import("mysql2").OkPacket[] | [import("mysql2").RowDataPacket[], ResultSetHeader] | T | T[]>;
    findOne(query?: Query<T>, options?: FindOneOptions<T>): Promise<(import("mysql2").QueryResult | T | T[]) | undefined>;
    deleteOne(query?: Query<T>): Promise<ResultSetHeader>;
    deleteMany(query?: Query<T>): Promise<ResultSetHeader>;
    insertOne(data: T, opt?: InsertOptions): Promise<import("mysql2").QueryResult>;
    insertMany(data: T[], opt?: insertManyOptions): Promise<ResultSetHeader>;
    updateOne(query: Query<T>, data: Partial<T & any>): Promise<ResultSetHeader>;
    updateMany(query: Query<T>, data: Partial<T>): Promise<ResultSetHeader>;
    aggregate(options: AggregationOptions<T>): Promise<unknown[]>;
    count<T>(options: MathOptions<T>): Promise<number>;
    sum<T>(options: MathOptions<T>): Promise<number>;
    avg(options?: MathOptions<T>): Promise<number>;
    max(options?: MathOptions<T>): Promise<number>;
    min(options?: MathOptions<T>): Promise<number>;
    clear(): Promise<ResultSetHeader>;
    execute(sql: string, params: any[]): Promise<import("mysql2").QueryResult>;
    /**
    *推荐当前使用连接池时使用
    * 从连接池借出一个绑定的执行器。
    * 注意：使用完毕后必须手动调用 executor.release() 归还连接。
    */
    checkout(): Promise<Executor<T>>;
    /**
     * 自动事务包装器
     * 逻辑：获取连接 -> 开启事务 -> 执行回调 -> 提交 -> 释放
     * 报错：自动回滚 -> 抛出错误 -> 释放
     */
    withTransaction<P = any>(callback: (model: Executor<T>) => Promise<P>): Promise<P>;
    withPollConnection<P = any>(callback: (model: Executor<T>) => Promise<P>): Promise<P>;
    qualifyField(fieldName: string): string;
    qualifyFields(fieldNames?: string[]): string[];
}
export default Model;
//# sourceMappingURL=index.d.ts.map