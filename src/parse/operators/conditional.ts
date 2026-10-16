/*
        操作符	描述	示例
        $eq	等于	{ age: { $eq: 25 } }
        $ne	不等于	{ age: { $ne: 25 } }
        $gt	大于	{ age: { $gt: 25 } }
        $gte	大于等于	{ age: { $gte: 25 } }
        $lt	小于	{ age: { $lt: 25 } }
        $lte	小于等于	{ age: { $lte: 25 } }
        $in	在指定数据中	{ age: { $in: [25, 30, 35] } }
        $nin	不在指定数据中	{ age: { $nin: [25, 30, 35] } }
        $like	包含	{ name: { $like: "John" } }
        $nlike	不包含	{ name: { $nlike: "John" } }
        $between 在指定范围内	{ age: { $between: [20, 30] } }
*/
import { Query } from "./index.js"
import type { Join } from "./aggregate.js"
export type SelectType = "raw" | "jsonObject" | "jsonArray" | "count";
export enum SelectMode {
        select = "$select",
        exists = "$exists"
}
export const QueryOperatorMap = {
        '$eq': "=",
        '$ne': "!=",
        '$gt': ">",
        '$gte': ">=",
        '$lt': "<",
        '$lte': "<=",
        '$in': "IN",
        '$nin': "NOT IN",
        '$like': "LIKE",
        '$nlike': "NOT LIKE",
        "$between": "BETWEEN",
        "$select": "SELECT",
        "$exists": "EXISTS",
        "$col": "COL",
        "$case": "CASE"
} as const;


export interface QueryOperators<V> {
        /** 等于  {age:{$eq:1}} */
        $eq?: V;
        /** 不等于 {age:{$ne:1}} */
        $ne?: V;
        /** 大于  {age:{$gt:1}}*/
        $gt?: V;
        /** 大于等于 {ege:{$gte:1}}*/
        $gte?: V;
        /** 小于  {age:{$lt:1}} */
        $lt?: V;
        /** 小于等于 { age:{$lte:1}} */
        $lte?: V;
        /** 包含  {age:{$in:[1,2,3]}} */
        $in?: V[];
        /** 不包含  {age:{$nin:[1,2,3]}}*/
        $nin?: V[];
        /** 模糊匹配 { name: { $like: "John" },{nickname: { $like: "Jo%" }} ,{nickname: { $like: "%Jo" }*/
        $like?: string;
        /** 模糊匹配 不包含 { name: { $nlike: "John" } } */
        $nlike?: string;
        /** 范围查询 */
        $between?: [V, V];
        $exists?: V;
        /** 子查询 */
        $select?: Select
        /** CASE */
        $case?: any;
}

// 也就是：这个数组本身的类型
// export type QueryOperators = keyof typeof QueryOperatorMap;

export type Select<T = any> = {
        table: string;
        type?: SelectType;
        fields?: Extract<keyof T, string>[];
        query?: Query<T>;
        joins?: Join[],
        limit?: number;
        offset?: number;
};