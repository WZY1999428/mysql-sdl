import mysql from "mysql2/promise";
class Client {
    conn = null;
    dbPoll = null;
    isPool = false;
    release = false;
    database = '';
    constructor(conn = null) {
        this.conn = conn;
    }
    static async createDataBase(dbName, conn) {
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4;`);
        await conn.query(`USE \`${dbName}\`;`);
    }
    static async connection(options) {
        const { database, ...connectionConfig } = options;
        const conn = await mysql.createConnection(connectionConfig);
        if (database) {
            await Client.createDataBase(database, conn);
        }
        return new Client(conn);
    }
    static async connectionPool(options) {
        const { database, createDatabase = false, ...initConfig } = options;
        if (database && createDatabase) {
            const initPool = mysql.createPool(initConfig);
            const conn = await initPool.getConnection();
            await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4;`);
            conn.release();
            await initPool.end();
        }
        const instance = new Client();
        instance.isPool = true;
        instance.database = database || '';
        const { createDatabase: _, ...poolConfig } = options;
        instance.dbPoll = mysql.createPool(poolConfig);
        instance.release = options.release || true;
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
    async beginTransaction(callback) {
        let started = false;
        const conn = await this.getConnection();
        try {
            await conn.beginTransaction();
            started = true;
            await callback(conn);
            await conn.commit();
        }
        catch (error) {
            if (started)
                await conn.rollback();
            throw error;
        }
        finally {
            if (this.isPool && conn && conn.release) {
                conn.release();
            }
        }
    }
}
export default Client;
