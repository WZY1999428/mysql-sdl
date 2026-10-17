"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = parseQuery;
exports.parseSelect = parseSelect;
const index_js_1 = require("../utils/index.js");
const index_js_2 = require("./operators/index.js");
const conditional_js_1 = require("./operators/conditional.js");
const parseJoin_js_1 = __importDefault(require("../parse/parseJoin.js"));
const parseCase_js_1 = __importDefault(require("../parse/parseCase.js"));
const regex_js_1 = __importDefault(require("./operators/regex.js"));
// 校验是否为合法的逻辑子项数组
function parseQuery(query) {
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
        if (index_js_2.LogicalMap[key]) {
            if (!Array.isArray(value)) {
                (0, index_js_1.throwError)(`Logical operator "${key}" requires an array of query objects. Received: ${JSON.stringify(value)}`);
            }
            // ✅ 新增：检查数组里每一项必须是对象
            if (!value.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) {
                (0, index_js_1.throwError)(`Invalid item in "${key}": Each element must be a non-null plain object.`);
            }
            if (key == "$and" || key == "$or") {
                const arr = value.map((v) => parse(v, params));
                if (arr.length) {
                    segments.push(`(${arr.join(` ${index_js_2.LogicalMap[key]} `)})`);
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
                params.push((0, regex_js_1.default)(value));
            }
            else {
                (0, index_js_1.throwError)(`The value for "$regex" must be a JavaScript RegExp instance. Received: ${typeof value}`);
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
            segments.push(` EXISTS (${parseSelect("", value, params, conditional_js_1.SelectMode.exists)}) `);
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
            if (!index_js_2.QueryOperatorMap[op]) {
                (0, index_js_1.throwError)(`Invalid operator "${op}" at "${key}"`);
            }
            const val = value[op];
            if (op === "$select") {
                segments.push(`${(0, index_js_1.quote)(key)} = (${parseSelect(key, val, params)}) `);
                break;
            }
            if (op === "$exists") {
                segments.push(` ${(0, index_js_1.quote)(key)} = EXISTS (${parseSelect(key, value, params, conditional_js_1.SelectMode.exists)}) `);
                break;
            }
            if (op === "$case") {
                const caseSql = (0, parseCase_js_1.default)(key, val, params);
                segments.push(`${(0, index_js_1.quote)(key)} = ${caseSql}`);
                break;
            }
            if (op === "$col") {
                if (val && typeof val === 'string') {
                    segments.push(`${key} = ${(0, index_js_1.quote)(val)}`);
                }
                else {
                    (0, index_js_1.throwError)(`"${op}" at "${key}" requires a string value. Received: ${JSON.stringify(val)}`);
                }
                continue;
            }
            if (op === "$exists") {
                segments.push(`${(0, index_js_1.quote)(key)} = EXISTS (${parseSelect(key, val, params)})`);
                continue;
            }
            if (op === '$between') {
                if (!Array.isArray(val)) {
                    (0, index_js_1.throwError)(`"$between" operator at "${key}" requires an array of exactly 2 numbers.`);
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
            else if (index_js_2.QueryOperatorMap[op]) {
                if (op == "$in" || op == "$nin") {
                    if (!Array.isArray(val)) {
                        (0, index_js_1.throwError)(`"${op}" operator at "${key}" expects an array. Received: ${typeof val}`);
                    }
                    ;
                    if (!val.every((v) => typeof v === "number" || typeof v === "string" || (0, index_js_1.isObject)(v))) {
                        (0, index_js_1.throwError)(`Invalid collection for "${op}" at "${key}": Elements must be strings or numbers. (Found invalid item in: ${JSON.stringify(val)})`);
                    }
                    segments.push(`${key} ${index_js_2.QueryOperatorMap[op]} (${val.map((v) => {
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
                        (0, index_js_1.throwError)(`"${op}" at "${key}" only accepts string or number values. Received: ${typeof val}`);
                    }
                    segments.push(`${key} ${index_js_2.QueryOperatorMap[op]} ?`);
                    params.push(val);
                }
                else {
                    if (val && typeof val !== "string" && typeof val !== 'number') {
                        (0, index_js_1.throwError)(`"${op}" at "${key}" only accepts string or number values. Received: ${typeof val}`);
                    }
                    if (typeof val === 'object' && val !== null) {
                        const sql = parse(val, params);
                        const sqlOp = index_js_2.QueryOperatorMap[op];
                        segments.push(`${key} ${sqlOp} ${sql}`);
                    }
                    else {
                        const sqlOp = index_js_2.QueryOperatorMap[op];
                        segments.push(`${key} ${sqlOp} ?`);
                        params.push(val);
                    }
                }
            }
            else if (typeof val === 'object') {
                if (Array.isArray(val) && !val.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) {
                    (0, index_js_1.throwError)(`Invalid nested logic: "${op}" at "${key}" must contain an array of query objects. (Check: ${JSON.stringify(val)})`);
                }
            }
        }
    }
    else {
        segments.push(`${key} = ?`);
        params.push(value);
    }
}
function parseSelect(key, val, params, selectMode = conditional_js_1.SelectMode.select) {
    if (typeof val !== "object") {
        (0, index_js_1.throwError)(`"${selectMode}" operator at "${key}" requires an object.`);
    }
    if (!val.table || typeof val.table !== "string") {
        (0, index_js_1.throwError)(`"${selectMode}" operator at "${key}" requires a "table" property.`);
    }
    if (val.fields && !Array.isArray(val.fields)) {
        (0, index_js_1.throwError)(`"${selectMode}" operator at "${key}" requires a "fields" property as an array.`);
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
        const { joinSql: joinSqlStr, select: joinSelect, params: joinParams } = (0, parseJoin_js_1.default)(val.joins);
        params.push(...joinParams);
        joinSql = joinSqlStr;
        select = joinSelect;
    }
    const fields = selectMode === conditional_js_1.SelectMode.exists ? "1" : val.fields?.map((f) => (0, index_js_1.quote)(f)).join(", ") || "*";
    if (val.offset) {
        limitStr += ` OFFSET ${val.offset}`;
    }
    let whereStr = "";
    if (val.query) {
        whereStr = ` WHERE ${parse(val.query, params)}`;
    }
    return ` SELECT ${select ? `${select}, ` : ``} ${fields} FROM ${(0, index_js_1.quote)(val.table)} ${joinSql} ${whereStr} ${limitStr}  `;
}
