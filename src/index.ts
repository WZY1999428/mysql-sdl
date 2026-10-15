import Client from "./client.js";
import type { ConnectionOptions } from "mysql2/promise"
import { Schema } from "./schema/index.js";
import Model from "./model/index.js";

class MySqlODM {
    models: Map<string, Model<any>>
    client: Client | null = null;
    debug: boolean = false;

    constructor(options?: {
        debug?: boolean
    }) {
        this.models = new Map();
        Model.debug = options?.debug || false;
        console.log("Database connected");
    }

    async use(options: ConnectionOptions, type: 'connection' | 'pool' = 'pool') {
        this.client = type === 'connection'
            ? await Client.connection(options)
            : await Client.connectionPool(options);
    }

    async model<T>(table: string, schema?: Schema<T>): Promise<Model<T>> {
        if (!this.client) throw new Error("Database not connected");
        if (this.models.has(table)) return this.models.get(table) as Model<T>;
        if (!(schema instanceof Schema)) {
            throw new Error("schema must be an instance of Schema");
        }
        schema.table = table;
        const model = new Model<T>(table, schema, this.client!);
        await model.execute(`SHOW COLUMNS FROM ${table}`, []).then(async fields => {
            const notFields = [];
            for (const key in schema.fields) {
                if (!(fields as any[]).some((item: any) => item.Field === key)) {
                    notFields.push(key);
                }
            }
            if (notFields.length > 0) {
                // TODO: 创建缺失的字段
                for (const fieldName of notFields) {
                    const uniqueGroupMap = new Map();
                    const indexs = new Set<string>();
                    const config = schema.fields[fieldName];
                    const { definition, alterTable } = schema.parseFields(fieldName, config, uniqueGroupMap, indexs);
                    const sql = `ALTER TABLE \`${table}\` ADD COLUMN ${definition};`;
                    await model.execute(sql, []);
                    if (alterTable) {
                        await model.execute(alterTable, []);
                    }
                }
                console.warn(`已自动添加新增字段: ${notFields.join(', ')}`);
            }
        }).catch(err => { })

        this.models.set(table, model);
        return model
    }
    getModels() {
        return this.models.keys();
    }
}

export default MySqlODM;








