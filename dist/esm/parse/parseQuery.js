import { isObject, quote, throwError } from "../utils/index.js";
import { LogicalMap, QueryOperatorMap } from "./operators/index.js";
import { SelectMode } from "./operators/conditional.js";
import parseJoin from "../parse/parseJoin.js";
import parseCase from "../parse/parseCase.js";
import jsRegexToMySQL from "./operators/regex.js";
// 校验是否为合法的逻辑子项数组
export default function parseQuery(query) {
    const params = [];
    return {
        sql: parse(query, params),
        params: params.map(param => {
            if (param === undefined || param === "") {
                return null;
            }
            return param;
        })
    };
}
function parse(query, params) {
    const segments = [];
    const keys = Object.keys(query);
    for (let key of keys) {
        let value = query[key]; // 现在不报错了
        if (LogicalMap[key]) {
            if (!Array.isArray(value)) {
                throwError(`Logical operator "${key}" requires an array of query objects. Received: ${JSON.stringify(value)}`);
            }
            // ✅ 新增：检查数组里每一项必须是对象
            if (!value.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) {
                throwError(`Invalid item in "${key}": Each element must be a non-null plain object.`);
            }
            if (key == "$and" || key == "$or") {
                const arr = value.map((v) => parse(v, params));
                if (arr.length) {
                    segments.push(`(${arr.join(` ${LogicalMap[key]} `)})`);
                }
            }
            else if (key === '$not') {
                const arr = value.map((v) => parse(v, params));
                if (arr.length) {
                    segments.push(`NOT (${arr.join(' AND ')})`);
                }
            }
            else if (key === '$nor') {
                const arr = value.map((v) => parse(v, params));
                if (arr.length) {
                    segments.push(`NOT (${arr.join(' OR ')})`);
                }
            }
            continue;
        }
        if (key === "$regex") {
            if (value && value instanceof RegExp) {
                segments.push(`${key} REGEXP ?`);
                params.push(jsRegexToMySQL(value));
            }
            else {
                throwError(`The value for "$regex" must be a JavaScript RegExp instance. Received: ${typeof value}`);
            }
            continue;
        }
        if (key === "$col") {
            if (typeof value === "string") {
                segments.push(String(value));
            }
            else {
                throwError(`The value for "$col" must be a string or number. Received: ${typeof value}`);
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
            segments.push(` EXISTS (${parseSelect("", value, params, SelectMode.exists)}) `);
            continue;
        }
        buildWhereClause(value, key, segments, params);
    }
    // 关键：在 join 前再次过滤，确保没有空隙
    return segments.filter(Boolean).join(" AND ");
}
function buildWhereClause(value, key, segments, params) {
    // 2. 处理普通字段
    if (value && typeof value === 'object' && !Array.isArray(value) && value !== null) {
        const keys = Object.keys(value);
        for (const op of keys) {
            // if ((op as any).startsWith("$")) {
            //     throwError(`Ambiguous query at "${key}": SQL databases do not support implicit nested objects ${JSON.stringify(value)}. Did you mean "${key}.field" (JSON path) or an operator like "$eq"?`);
            // }
            if (!QueryOperatorMap[op]) {
                throwError(`Invalid operator "${op}" at "${key}"`);
            }
            const val = value[op];
            if (op === "$select") {
                segments.push(`${quote(key)} = (${parseSelect(key, val, params)}) `);
                break;
            }
            if (op === "$exists") {
                segments.push(` ${quote(key)} = EXISTS (${parseSelect(key, value, params, SelectMode.exists)}) `);
                break;
            }
            if (op === "$case") {
                const caseSql = parseCase(key, val, params);
                segments.push(`${quote(key)} = ${caseSql}`);
                break;
            }
            if (op === "$col") {
                segments.push(`${key} = ${quote(val)}`);
                break;
            }
            if (op === "$exists") {
                segments.push(`${quote(key)} = EXISTS (${parseSelect(key, val, params)})`);
                break;
            }
            if (op === '$between') {
                if (!Array.isArray(val)) {
                    throwError(`"$between" operator at "${key}" requires an array of exactly 2 numbers.`);
                }
                const sorted = [...val].sort((a, b) => {
                    const da = a instanceof Date ? a.getTime() : Date.parse(a);
                    const db = b instanceof Date ? b.getTime() : Date.parse(b);
                    if (!Number.isNaN(da) && !Number.isNaN(db)) {
                        return da - db;
                    }
                    return a > b ? 1 : a < b ? -1 : 0;
                });
                segments.push(`${key} BETWEEN ? AND ?`);
                params.push(sorted[0], sorted.at(-1));
            }
            else if (QueryOperatorMap[op]) {
                if (op == "$in" || op == "$nin") {
                    if (!Array.isArray(val)) {
                        throwError(`"${op}" operator at "${key}" expects an array. Received: ${typeof val}`);
                    }
                    ;
                    if (!val.every((v) => typeof v === "number" || typeof v === "string" || isObject(v))) {
                        throwError(`Invalid collection for "${op}" at "${key}": Elements must be strings or numbers. (Found invalid item in: ${JSON.stringify(val)})`);
                    }
                    segments.push(`${key} ${QueryOperatorMap[op]} (${val.map((v) => {
                        if (typeof v === "object") {
                            return parseSelect(op, v, params);
                        }
                        else {
                            return "?";
                        }
                    }).join(",")})`);
                    params.push(...val);
                }
                else if (op == "$like" || op == "$nlike") {
                    if (val && typeof val !== "string" && typeof val !== 'number') {
                        throwError(`"${op}" at "${key}" only accepts string or number values. Received: ${typeof val}`);
                    }
                    segments.push(`${key} ${QueryOperatorMap[op]} ?`);
                    params.push(val);
                }
                else {
                    // if (val && typeof val !== "string" && typeof val !== 'number') {
                    //     throwError(`"${op}" at "${key}" only accepts string or number values. Received: ${typeof val}`)
                    // }
                    if (typeof val === 'object' && val !== null) {
                        const sql = parse(val, params);
                        const sqlOp = QueryOperatorMap[op];
                        segments.push(`${key} ${sqlOp} ${sql}`);
                    }
                    else {
                        const sqlOp = QueryOperatorMap[op];
                        segments.push(`${key} ${sqlOp} ?`);
                        params.push(val);
                    }
                }
            }
            else if (typeof val === 'object') {
                if (Array.isArray(val) && !val.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) {
                    throwError(`Invalid nested logic: "${op}" at "${key}" must contain an array of query objects. (Check: ${JSON.stringify(val)})`);
                }
            }
        }
    }
    else {
        segments.push(`${key} = ?`);
        params.push(value);
    }
}
export function parseSelect(key, val, params, selectMode = SelectMode.select) {
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
    let select = "";
    if (val.joins && Array.isArray(val.joins)) {
        const { joinSql: joinSqlStr, select: joinSelect, params: joinParams } = parseJoin(val.joins);
        params.push(...joinParams);
        joinSql = joinSqlStr;
        select = joinSelect;
    }
    const fields = selectMode === SelectMode.exists ? "1" : val.fields?.map((f) => quote(f)).join(", ") || "*";
    if (val.offset) {
        limitStr += ` OFFSET ${val.offset}`;
    }
    let whereStr = "";
    if (val.query) {
        whereStr = ` WHERE ${parse(val.query, params)}`;
    }
    return ` SELECT ${select ? `${select}, ` : ``} ${fields} FROM ${quote(val.table)} ${joinSql} ${whereStr} ${limitStr}  `;
}
