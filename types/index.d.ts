import Client from "./client.js";
import type { ConnectionOptions } from "mysql2/promise";
import { Schema } from "./schema/index.js";
import Model from "./model/index.js";
export type SnowflakeOptions = {
    workerId: number;
    datacenterId: number;
};
declare class MySqlODM {
    models: Map<string, Model<any>>;
    client: Client | null;
    debug: boolean;
    private snowflake;
    constructor(options?: {
        logger?: boolean;
        snowflake: SnowflakeOptions;
    });
    use(options: ConnectionOptions & {
        release?: boolean;
        createDatabase?: boolean;
    }, type?: 'connection' | 'pool'): Promise<void>;
    model<T>(table: string, schema?: Schema<T>): Promise<Model<T>>;
    getModels(): MapIterator<string>;
}
export default MySqlODM;
//# sourceMappingURL=index.d.ts.map