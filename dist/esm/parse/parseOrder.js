const ORDER_MAP = { 'asc': 'ASC', 'desc': 'DESC' };
import parseQuery from './parseQuery.js';
export default function parseOrder(order, params) {
    const orderSql = [];
    for (const [k, dir] of Object.entries(order)) {
        if (dir == null)
            continue;
        if (k === "$expr" && Array.isArray(dir)) {
            for (const expr of dir) {
                const { sql, params: newParams } = parseQuery(expr.query);
                orderSql.push(`(${sql}) ${(expr.order ?? "asc").toUpperCase()}`);
                params?.push(...newParams);
            }
            continue;
        }
        orderSql.push(`${k} ${ORDER_MAP[dir]}`);
    }
    if (orderSql.length === 0)
        return '';
    return `ORDER BY ${orderSql.join(', ')}`;
}
