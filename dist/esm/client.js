import mysql from "mysql2/promise";
import { Snowflake } from "./utils/index.js";
class Client {
    conn = null;
    dbPoll = null;
    snowflake;
    isPool = false;
    constructor(conn = null, snowflake) {
        this.conn = conn;
        this.snowflake = new Snowflake(snowflake.workerId, snowflake.datacenterId);
    }
    static async createDataBase(dbName, conn) {
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4;`);
        await conn.query(`USE \`${dbName}\`;`);
    }
    static async connection(options, snowflake) {
        const { database, ...connectionConfig } = options;
        const conn = await mysql.createConnection(connectionConfig);
        if (database) {
            await Client.createDataBase(database, conn);
        }
        return new Client(conn, snowflake);
    }
    static async connectionPool(options, snowflake) {
        const { database, createDatabase = false, ...initConfig } = options;
        if (database && createDatabase) {
            const initPool = mysql.createPool(initConfig);
            const conn = await initPool.getConnection();
            await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4;`);
            conn.release();
            await initPool.end();
        }
        const instance = new Client(null, snowflake);
        instance.isPool = true;
        const { createDatabase: _, ...poolConfig } = options;
        instance.dbPoll = mysql.createPool(poolConfig);
        return instance;
    }
    async getConnection() {
        if (this.isPool) {
            const conn = await this.dbPoll.getConnection();
            return conn;
        }
        ;
        return this.conn;
    }
    async end() {
        if (this.isPool)
            await this.dbPoll.end();
        else if (this.conn)
            await this.conn.end();
    }
    async destroy() {
        if (this.isPool)
            this.dbPoll.destroy();
        else if (this.conn)
            this.conn.destroy();
    }
    async execute(sql, params = []) {
        let conn = null;
        try {
            conn = await this.getConnection(); // 1. 拿钥匙
            const [result] = await conn.execute(sql, params);
            return result;
        }
        catch (err) {
            console.error("SQL执行失败:", sql, err);
            throw err;
        }
        finally {
            if (this.isPool && conn && conn.release) {
                conn.release();
            }
        }
    }
    async withConnExecute(conn, sql, params = []) {
        try {
            if (!conn)
                throw new Error("No Connection");
            const [result] = await conn.execute(sql, params);
            return result;
        }
        catch (err) {
            console.error("SQL执行失败:", sql, err);
            throw err;
        }
    }
}
export default Client;
