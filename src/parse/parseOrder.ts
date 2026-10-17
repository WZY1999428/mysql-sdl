const ORDER_MAP = { 'asc': 'ASC', 'desc': 'DESC' }
type Expr = {
    expr: any;
    order?: 'asc' | 'desc';
};
export type OrderBy<T> =
    | Partial<Record<keyof T | string, 'asc' | 'desc'>>
    | {
        $expr?: Expr[];
        $random?: boolean;
    };

import parseQuery from './parseQuery.js'

export default function parseOrder<T>(
    order: OrderBy<T>,
    params?: any[]
) {
    const orderSql: string[] = [];

    for (const [k, dir] of Object.entries(order)) {
        if (dir == null) continue;

        if (k === "$expr" && Array.isArray(dir)) {

            for (const expr of dir) {
                const { sql, params: newParams } = parseQuery(expr.expr);
                orderSql.push(
                    `(${sql}) ${(expr.order ?? "asc").toUpperCase()}`
                );
                params?.push(...newParams);
            }
            continue;
        }

        if (k === "$random" && dir === true) {
            orderSql.push("RAND()");
            continue;
        }

        orderSql.push(
            `${k} ${ORDER_MAP[dir as keyof typeof ORDER_MAP]}`
        );
    }

    if (orderSql.length === 0) return '';

    return `ORDER BY ${orderSql.join(', ')}`;
}