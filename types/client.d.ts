import type { Connection, ConnectionOptions, PoolConnection, PoolOptions, QueryResult, ResultSetHeader } from "mysql2/promise";
type Result = QueryResult | ResultSetHeader;
export type newConnection = Connection | PoolConnection;
type Options = PoolOptions & {
    release?: boolean;
    createDatabase?: boolean;
};
import { Snowflake } from "./utils/index.js";
import { SnowflakeOptions } from "./index.js";
declare class Client {
    private conn;
    private dbPoll;
    snowflake: Snowflake;
    isPool: boolean;
    private constructor();
    private static createDataBase;
    static connection(options: ConnectionOptions, snowflake: SnowflakeOptions): Promise<Client>;
    static connectionPool(options: Options, snowflake: SnowflakeOptions): Promise<Client>;
    getConnection(): Promise<newConnection>;
    end(): Promise<void>;
    destroy(): Promise<void>;
    execute(sql: string, params?: any[]): Promise<Result>;
    withConnExecute(conn: newConnection, sql: string, params?: any[]): Promise<Result>;
}
export default Client;
//# sourceMappingURL=client.d.ts.map