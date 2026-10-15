import type { Connection, ConnectionOptions, PoolConnection, PoolOptions, QueryResult, ResultSetHeader } from "mysql2/promise";
type Result = QueryResult | ResultSetHeader;
export type newConnection = Connection | PoolConnection;
type Options = PoolOptions & {
    release?: boolean;
    createDatabase?: boolean;
};
declare class Client {
    private conn;
    private dbPoll;
    isPool: boolean;
    private release;
    private database;
    private constructor();
    private static createDataBase;
    static connection(options: ConnectionOptions): Promise<Client>;
    static connectionPool(options: Options): Promise<Client>;
    getConnection(): Promise<newConnection>;
    end(): Promise<void>;
    destroy(): Promise<void>;
    execute(sql: string, params?: any[]): Promise<Result>;
    withConnExecute(conn: newConnection, sql: string, params?: any[]): Promise<Result>;
}
export default Client;
//# sourceMappingURL=client.d.ts.map