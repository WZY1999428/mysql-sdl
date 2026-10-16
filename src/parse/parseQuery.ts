import { isObject, quote, throwError } from "../utils/index.js";
import { LogicalMap, QueryOperatorMap } from "./operators/index.js";
import type { Select } from "./operators/conditional.js";
import { SelectMode } from "./operators/conditional.js";
import parseJoin from "../parse/parseJoin.js"
import parseCase from "../parse/parseCase.js"

import type { Query, Logical, QueryOperators, } from "./operators/index.js";
import type { Case } from "./operators/case.js";
import jsRegexToMySQL from "./operators/regex.js"
type OperatorKeys = keyof QueryOperators<any>;

// 校验是否为合法的逻辑子项数组
export default function parseQuery<T>(query: Query<T>): { sql: string, params: any[] } {
    const params: any[] = [];

    return {
        sql: parse(query, params),
        params: params.map(param => {
            if (param === undefined || param === "") {
                return null;
            }
            return param;
        })
    }

}



function parse<T>(query: Query<T>, params: any[]) {
    const segments: string[] = [];
    const keys = Object.keys(query) as Array<keyof Query<T>>;
    for (let key of keys) {
        let value = query[key]; // 现在不报错了
        if (LogicalMap[key as Logical]) {
            if (!Array.isArray(value)) {
                throwError(`Logical operator "${key}" requires an array of query objects. Received: ${JSON.stringify(value)}`)
            }
            // ✅ 新增：检查数组里每一项必须是对象
            if (!value.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) {
                throwError(`Invalid item in "${key}": Each element must be a non-null plain object.`);
            }
            if (key == "$and" || key == "$or") {
                const arr = value.map((v) => parse(v, params));
                if (arr.length) {
                    segments.push(`(${arr.join(` ${LogicalMap[key as Logical]} `)})`);
                }
            } else if (key === '$not') {
                const arr = value.map((v) => parse(v, params));
                if (arr.length) {
                    segments.push(`NOT (${arr.join(' AND ')})`);
                }

            } else if (key === '$nor') {
                const arr = value.map((v) => parse(v, params));
                if (arr.length) {
                    segments.push(`NOT (${arr.join(' OR ')})`);
                }

            }
            continue;
        }



        if (key === "$regex") {

            if (value && (value as unknown) instanceof RegExp) {

                segments.push(`${key} REGEXP ?`);

                params.push(jsRegexToMySQL(value));

            } else {
                throwError(`The value for "$regex" must be a JavaScript RegExp instance. Received: ${typeof value}`);

            }

            continue;
        }

        // 处理 $json 操作符
        if (key === "$json") {
            for (let k in value) {
                const [column, ...path] = k.split('.');
                const jsonPath = `$.${path.join('.')}`;
                const newKey = `${column}->>'${jsonPath}'`;
                buildWhereClause(value[k], newKey, segments, params);
            }
            continue;
        }

        if (key === "$exists") {
            segments.push(` EXISTS (${parseSelect("", value as Select, params, SelectMode.exists)}) `);
            continue;
        }

        buildWhereClause(value, key, segments, params);

    }
    // 关键：在 join 前再次过滤，确保没有空隙
    return segments.filter(Boolean).join(" AND ");
}


function buildWhereClause<T>(value: any, key: string | number, segments: string[], params: any[]) {
    // 2. 处理普通字段
    if (value && typeof value === 'object' && !Array.isArray(value) && value !== null) {

        const keys = Object.keys(value) as Array<keyof Query<T>>;
        for (const op of keys) {
            // if ((op as any).startsWith("$")) {
            //     throwError(`Ambiguous query at "${key}": SQL databases do not support implicit nested objects ${JSON.stringify(value)}. Did you mean "${key}.field" (JSON path) or an operator like "$eq"?`);
            // }
            if (!QueryOperatorMap[op as OperatorKeys]) {
                throwError(`Invalid operator "${op}" at "${key}"`);
            }

            const val = (value as Record<string, any>)[op as string];

            if (op === "$select") {

                segments.push(`${quote(key as string)} = (${parseSelect(key as string, val as Select, params)}) `);

                break;
            }

            if (op === "$exists") {
                segments.push(` ${quote(key as string)} = EXISTS (${parseSelect(key as string, value as Select, params, SelectMode.exists)}) `);
                break;
            }

            if (op === "$case") {
                const caseSql = parseCase(key as string, val as Case, params);
                segments.push(`${quote(key as string)} = ${caseSql}`);
                break;
            }


            if (op === "$col") {
                if (val && typeof val === 'string') {
                    segments.push(`${key} = ${quote(val)}`);
                } else {
                    throwError(`"${op}" at "${key}" requires a string value. Received: ${JSON.stringify(val)}`);
                }
                continue;
            }

            if (op === "$exists") {
                segments.push(`${quote(key as string)} = EXISTS (${parseSelect(key as string, val as Select, params)})`);
                continue;
            }

            if (op === '$between') {
                if (!Array.isArray(val)) {
                    throwError(`"$between" operator at "${key}" requires an array of exactly 2 numbers.`)
                }
                const sorted = [...val].sort((a: any, b: any) => {
                    const da = a instanceof Date ? a.getTime() : Date.parse(a)
                    const db = b instanceof Date ? b.getTime() : Date.parse(b)
                    if (!Number.isNaN(da) && !Number.isNaN(db)) {
                        return da - db
                    }
                    return a > b ? 1 : a < b ? -1 : 0
                })
                segments.push(`${key} BETWEEN ? AND ?`);
                params.push(sorted[0], sorted.at(-1))

            } else if (QueryOperatorMap[op as OperatorKeys]) {

                if (op == "$in" || op == "$nin") {

                    if (!Array.isArray(val)) {
                        throwError(`"${op}" operator at "${key}" expects an array. Received: ${typeof val}`)
                    };

                    if (!val.every((v: any) => typeof v === "number" || typeof v === "string" || isObject(v))) {
                        throwError(`Invalid collection for "${op}" at "${key}": Elements must be strings or numbers. (Found invalid item in: ${JSON.stringify(val)})`)
                    }

                    segments.push(`${key} ${QueryOperatorMap[op as OperatorKeys]} (${val.map((v) => {
                        if (typeof v === "object") {
                            return parseSelect(op, v, params)
                        } else {
                            return "?"
                        }
                    }).join(",")})`);

                    params.push(...val);

                } else if (op == "$like" || op == "$nlike") {

                    if (val && typeof val !== "string" && typeof val !== 'number') {

                        throwError(`"${op}" at "${key}" only accepts string or number values. Received: ${typeof val}`)

                    }

                    segments.push(`${key} ${QueryOperatorMap[op as OperatorKeys]} ?`);

                    params.push(val);

                } else {

                    if (val && typeof val !== "string" && typeof val !== 'number') {
                        throwError(`"${op}" at "${key}" only accepts string or number values. Received: ${typeof val}`)
                    }
                    const sqlOp = QueryOperatorMap[op as OperatorKeys];

                    segments.push(`${key} ${sqlOp} ?`);

                    params.push(val);
                }
            } else if (typeof val === 'object') {

                if (Array.isArray(val) && !val.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) {
                    throwError(`Invalid nested logic: "${op}" at "${key}" must contain an array of query objects. (Check: ${JSON.stringify(val)})`)
                }
            }
        }
    } else {
        segments.push(`${key} = ?`);
        params.push(value);
    }
}




export function parseSelect(key: string, val: Select, params: any[], selectMode: SelectMode = SelectMode.select) {
    if (typeof val !== "object") {
        throwError(`"${selectMode}" operator at "${key}" requires an object.`);
    }

    if (!val.table || typeof val.table !== "string") {
        throwError(`"${selectMode}" operator at "${key}" requires a "table" property.`);
    }

    if (val.fields && !Array.isArray(val.fields)) {
        throwError(`"${selectMode}" operator at "${key}" requires a "fields" property as an array.`);
    }


    let limitStr = '';

    if (val.limit !== undefined && val.limit !== null) {
        const limit = Number(val.limit);
        const offset = val.offset ? Number(val.offset) : 0;

        // 推荐使用 MySQL 兼容性最好的 "LIMIT offset, count" 格式
        limitStr = ` LIMIT ${offset}, ${limit}`;
    }

    let joinSql = "";
    let select = ""

    if (val.joins && Array.isArray(val.joins)) {
        const { joinSql: joinSqlStr, select: joinSelect, params: joinParams } = parseJoin(val.joins);
        params.push(...joinParams);
        joinSql = joinSqlStr;
        select = joinSelect;

    }


    const fields = selectMode === SelectMode.exists ? "1" : val.fields?.map((f: string) => quote(f)).join(", ") || "*";

    if (val.offset) {
        limitStr += ` OFFSET ${val.offset}`;
    }

    let whereStr = "";
    if (val.query) {
        whereStr = ` WHERE ${parse(val.query, params)}`;
    }

    return ` SELECT ${select ? `${select}, ` : ``} ${fields} FROM ${quote(val.table)} ${joinSql} ${whereStr} ${limitStr}  `;
}
