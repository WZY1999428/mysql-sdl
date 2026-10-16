import type { Select } from "./operators/conditional.js";
import type { Query } from "./operators/index.js";
export default function parseQuery<T>(query: Query<T>): {
    sql: string;
    params: any[];
};
export declare function parseSelect(key: string, val: Select, params: any[]): string;
//# sourceMappingURL=parseQuery.d.ts.map