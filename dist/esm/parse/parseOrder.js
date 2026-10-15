const ORDER_MAP = { 'asc': 'ASC', 'desc': 'DESC' };
export default function parseOrder(order) {
    const orderSql = [];
    for (const k in order) {
        const dir = order[k];
        if (dir == null)
            continue;
        orderSql.push(`${k} ${ORDER_MAP[dir]}`);
    }
    if (orderSql.length === 0)
        return '';
    return `ORDER BY ${orderSql.join(', ')}`;
}
