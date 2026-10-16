/*
操作符	描述	示例
$and	逻辑与，符合所有条件	{ $and: [ { age: { $gt: 25 } }, { city: "New York" } ] }
$or	逻辑或，符合任意条件	{ $or: [ { age: { $lt: 25 } }, { city: "New York" } ] }
$not	取反，不符合条件	{ age: { $not: { $gt: 25 } } }
$nor	逻辑或非，均不符合条件	{ $nor: [ { age: { $gt: 25 } }, { city: "New York" } ] }
*/
export const LogicalMap = {
    '$and':" AND ",
    '$or':" OR ",
    '$not':"NOT",
    '$nor':"NOT OR"
} as const

export type Logical = keyof typeof LogicalMap;