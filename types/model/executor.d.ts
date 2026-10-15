import type { Query, AggregationOptions } from "../parse/operators/index.js";
import type { FindOptions, FindOneOptions, InsertOptions, insertManyOptions, MathOptions } from "./options.js";
import { newConnection } from "../client.js";
import { Schema } from "../schema/index.js";
import Client from "../client.js";
import { ResultSetHeader } from "mysql2";
declare class Executor<T> {
    private client;
    private table;
    private schema;
    conn?: newConnection | undefined;
    static debug: boolean;
    constructor(client: Client, table: string, schema: Schema<T>, conn?: newConnection | undefined);
    private buildLimit;
    /** 开启事务 */
    beginTransaction(): Promise<void>;
    /** 提交事务 */
    commit(): Promise<void>;
    /** 回滚事务 */
    rollback(): Promise<void>;
    release(): Promise<void>;
    execute(joinSql: string, params: any[]): Promise<import("mysql2").QueryResult>;
    findOne<T>(query: Query<T>, options?: FindOneOptions<T>): Promise<T | (import("mysql2").QueryResult | T_1 | T_1[]) | undefined>;
    count<T>(options: MathOptions<T>): Promise<number>;
    sum<T>(options: MathOptions<T>): Promise<number>;
    avg<T>(options: MathOptions<T>): Promise<number>;
    max<T>(options: MathOptions<T>): Promise<number>;
    min<T>(options: MathOptions<T>): Promise<number>;
    private buildMathSql;
    findMany<T>(query: Query<T>, options?: FindOptions<T>): Promise<import("mysql2").OkPacket | ResultSetHeader | ResultSetHeader[] | import("mysql2").RowDataPacket[] | import("mysql2").RowDataPacket[][] | import("mysql2").OkPacket[] | [import("mysql2").RowDataPacket[], ResultSetHeader] | T_1 | T_1[]>;
    private prepareFields;
    insertOne(data: T, opt?: InsertOptions): Promise<import("mysql2").QueryResult>;
    insertMany<T>(data: T[], opt?: insertManyOptions): Promise<ResultSetHeader>;
    updateOne(query: Query<T>, data: Partial<T>): Promise<ResultSetHeader>;
    updateMany(query: Query<T>, data: Partial<T>): Promise<any>;
    deleteOne(query: Query<T>): Promise<ResultSetHeader>;
    deleteMany<T>(query: Query<T>): Promise<ResultSetHeader>;
    clear(): Promise<ResultSetHeader>;
    aggregate<P>(options: AggregationOptions<T>): Promise<P[]>;
}
export default Executor;
//# sourceMappingURL=executor.d.ts.map