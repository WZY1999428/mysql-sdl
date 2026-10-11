import mysql from "mysql2/promise";
import type { Connection, ConnectionOptions, PoolConnection, PoolOptions, QueryResult, ResultSetHeader, Pool } from "mysql2/promise";

type Result = QueryResult | ResultSetHeader;
export type newConnection = Connection | PoolConnection
type Options = PoolOptions & {
    release?: boolean,
    createDatabase?: boolean
}
class Client {
    private conn: Connection | null = null;
    private dbPoll: Pool | null = null;
    isPool: boolean = false
    private release: boolean = false
    private database: string = ''
    private constructor(conn: Connection | null = null) {
        this.conn = conn;
    }


    private static async createDataBase(dbName: string, conn: Connection) {
        await (conn as any).query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4;`);
        await (conn as any).query(`USE \`${dbName}\`;`);
    }

    public static async connection(options: ConnectionOptions): Promise<Client> {
        const { database, ...connectionConfig } = options;
        const conn = await mysql.createConnection(connectionConfig);
        if (database) {
            await Client.createDataBase(database, conn);
        }
        return new Client(conn);
    }

    public static async connectionPool(options: Options): Promise<Client> {
        const { database, createDatabase = false, ...initConfig } = options;
        const initPool = mysql.createPool(initConfig);
        if (database && createDatabase) {
            const conn = await initPool.getConnection();
            await (conn as any).query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4;`);
            conn.release();
            await initPool.end();
        }
        const instance = new Client();
        instance.isPool = true
        instance.database = database || '';
        const { createDatabase: _, ...poolConfig } = options;
        instance.dbPoll = mysql.createPool(poolConfig);
        instance.release = options.release || true;
        return instance!
    }

    public async getConnection(): Promise<newConnection> {
        if (this.isPool) {
            const conn = await this.dbPoll!.getConnection()
            return conn
        };
        return this.conn!;
    }

    public async end() {
        if (this.isPool) await this.dbPoll!.end();
        else if (this.conn) await this.conn.end();
    }

    public async destroy() {
        if (this.isPool) this.dbPoll!.destroy();
        else if (this.conn) this.conn.destroy();
    }
    async execute(sql: string, params: any[] = []): Promise<Result> {
        let conn: newConnection | null = null;
        try {
            conn = await this.getConnection(); // 1. 拿钥匙
            const [result] = await (conn as any).execute(sql, params);
            return result as Result;
        } catch (err) {
            console.error("SQL执行失败:", sql, err);
            throw err;
        } finally {
            if (this.isPool && conn && (conn as PoolConnection).release) {
                (conn as PoolConnection).release();
            }
        }
    }


    async withConnExecute(conn: newConnection, sql: string, params: any[] = []): Promise<Result> {
        try {
            if (!conn) throw new Error("No Connection");
            const [result] = await (conn as any).execute(sql, params);
            return result as Result;
        } catch (err) {
            console.error("SQL执行失败:", sql, err);
            throw err;
        }
    }

    async beginTransaction(callback: (conn: newConnection) => Promise<void>) {
        let started = false;
        const conn = await this.getConnection();
        try {
            await conn!.beginTransaction();
            started = true
            await callback(conn!);
            await conn!.commit();
        } catch (error) {
            if (started) await conn!.rollback();
            throw error
        } finally {
            if (this.isPool && conn && (conn as PoolConnection).release) {
                (conn as PoolConnection).release();
            }
        }
    }
}



export default Client
