"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = parseAggregate;
exports.isAggregateOption = isAggregateOption;
const index_js_1 = require("../utils/index.js");
const parseQuery_js_1 = __importDefault(require("./parseQuery.js"));
const parseOrder_js_1 = __importDefault(require("./parseOrder.js"));
const parseJoin_js_1 = __importDefault(require("./parseJoin.js"));
function parseAggregate(table, options) {
    let sqlStr = "";
    let sleectSqlStr = "";
    const params = [];
    const { fields, specs, query, group, having, sort, joins, limit, offset } = options;
    if (Array.isArray(fields)) {
        if (!Array.isArray(fields)) {
            throw new Error("fields must be array");
        }
        const { fields: bFields, params: fieldParams } = (0, index_js_1.buildFields)(fields);
        params.push(...fieldParams);
        sleectSqlStr += ` ${bFields}  `;
    }
    else {
        sleectSqlStr += ` * `;
    }
    if (specs && Array.isArray(specs)) {
        const specsSql = [];
        for (const spec of specs) {
            if (!(0, index_js_1.isObject)(spec)) {
                throw new Error("each spec must be object");
            }
            if (spec.$max)
                specsSql.push(joinSpec("MAX", spec.$max, params));
            if (spec.$min)
                specsSql.push(joinSpec("MIN", spec.$min, params));
            if (spec.$sum)
                specsSql.push(joinSpec("SUM", spec.$sum, params));
            if (spec.$avg)
                specsSql.push(joinSpec("AVG", spec.$avg, params));
            if (spec.$count)
                specsSql.push(joinSpec("COUNT", spec.$count, params));
        }
        sqlStr += `, ${specsSql.join(", ")} `;
    }
    sqlStr += `FROM ${(0, index_js_1.quote)(table)} `;
    if (joins) {
        const { joinSql, select, params: joinParams } = (0, parseJoin_js_1.default)(joins);
        if (select)
            sleectSqlStr += `, ${select}`;
        // 4. 组装到主 SQL
        // 注意：JOIN 是紧跟在 FROM table 之后的
        sqlStr += ` ${joinSql}`;
        params.push(...joinParams);
    }
    if (query && Object.keys(query).length) {
        const { sql: sqlQuery, params: paramsQuery } = (0, parseQuery_js_1.default)(query);
        sqlStr += ` WHERE ${sqlQuery}`;
        params.push(...paramsQuery);
    }
    if (group && group.length) {
        sqlStr += ` GROUP BY ${group.join(', ')}`;
    }
    if (having && Object.keys(having).length) {
        const { sql: sqlQuery, params: paramsQuery } = (0, parseQuery_js_1.default)(having);
        sqlStr += ` HAVING ${sqlQuery}`;
        params.push(...paramsQuery);
    }
    if (sort) {
        sqlStr += ` ${(0, parseOrder_js_1.default)(sort, params)}`;
    }
    if (isFinite(limit)) {
        sqlStr += ` LIMIT ${limit}`;
    }
    if (isFinite(offset)) {
        sqlStr += ` OFFSET ${offset}`;
    }
    return { sql: `${sleectSqlStr} ${sqlStr}`, params };
}
function joinSpec(type, spec, params) {
    const parse = (spec) => {
        if (Array.isArray(spec)) {
            throw new Error("spec must be object or string");
        }
        if (isAggregateOption(spec)) {
            if (!spec.field) {
                throw new Error("field is required");
            }
            let str = "";
            let where = "";
            if (spec.where && Object.keys(spec.where).length) {
                const { sql, params: paramsWhere } = (0, parseQuery_js_1.default)(spec.where);
                where = ` WHERE ${sql} `;
                params.push(...paramsWhere);
            }
            if (spec.from)
                str += `( SELECT ${type}(${spec.field}) FROM ${(0, index_js_1.quote)(spec.from)}${where}) `;
            else
                str += ` ${type}(${spec.field}) `;
            if (spec.as)
                str += `AS ${(0, index_js_1.quote)(spec.as)} `;
            else
                str += `AS ${type.toLocaleLowerCase()}_${spec.field} `;
            return str;
        }
        else {
            return `${type}(${String(spec)}) AS ${type.toLocaleLowerCase()}_${String(spec)} `;
        }
    };
    if (Array.isArray(spec)) {
        const sql = [];
        for (const s of spec) {
            sql.push(parse(s));
        }
        return sql.join(' , ');
    }
    return parse(spec);
}
function isAggregateOption(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
