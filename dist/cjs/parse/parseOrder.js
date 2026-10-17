"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = parseOrder;
const ORDER_MAP = { 'asc': 'ASC', 'desc': 'DESC' };
const parseQuery_js_1 = __importDefault(require("./parseQuery.js"));
function parseOrder(order, params) {
    const orderSql = [];
    for (const [k, dir] of Object.entries(order)) {
        if (dir == null)
            continue;
        if (k === "$expr" && Array.isArray(dir)) {
            for (const expr of dir) {
                const { sql, params: newParams } = (0, parseQuery_js_1.default)(expr.expr);
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
