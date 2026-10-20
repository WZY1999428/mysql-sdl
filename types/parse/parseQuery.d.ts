import type { Query } from "./operators/index.js";
export default function parseQuery<T>(query: Query<T>): {
    sql: string;
    params: any[];
};
export declare function parse<T>(query: Query<T>, params: any[]): string;
//# sourceMappingURL=parseQuery.d.ts.map