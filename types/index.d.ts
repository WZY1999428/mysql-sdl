import Client from "./client.js";
import type { ConnectionOptions } from "mysql2/promise";
import { Schema } from "./schema/index.js";
import Model from "./model/index.js";
declare class MySqlODM {
    models: Map<string, Model<any>>;
    client: Client | null;
    debug: boolean;
    constructor(options?: {
        debug?: boolean;
    });
    use(options: ConnectionOptions, type?: 'connection' | 'pool'): Promise<void>;
    model<T>(table: string, schema?: Schema<T>): Promise<Model<T>>;
    private buildColumnSQL;
    getModels(): MapIterator<string>;
}
export default MySqlODM;
//# sourceMappingURL=index.d.ts.map