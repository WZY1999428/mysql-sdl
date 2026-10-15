const ORDER_MAP = { 'asc': 'ASC', 'desc': 'DESC' }
export type OrderBy<T> = Partial<Record<keyof T | string, 'asc' | 'desc'>>;
export default function parseOrder<T>(order: OrderBy<T>) {
    const orderSql = []
    for (const k in order) {
        const dir = order[k]
        if (dir == null) continue;
        orderSql.push(`${k} ${ORDER_MAP[dir]}`)
    }
    if (orderSql.length === 0) return '';
    return `ORDER BY ${orderSql.join(', ')}`
}
