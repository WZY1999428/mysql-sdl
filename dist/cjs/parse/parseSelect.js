"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = parseSelect;
const parseJoin_js_1 = __importDefault(require("../parse/parseJoin.js"));
const index_js_1 = require("../utils/index.js");
const conditional_js_1 = require("./operators/conditional.js");
const parseQuery_js_1 = require("./parseQuery.js");
// 聚合函数映射
const aggregateMap = {
    [conditional_js_1.SelectMode.count]: "COUNT",
    [conditional_js_1.SelectMode.max]: "MAX",
    [conditional_js_1.SelectMode.min]: "MIN",
    [conditional_js_1.SelectMode.sum]: "SUM",
    [conditional_js_1.SelectMode.avg]: "AVG"
};
/**
 * 将 JOIN SELECT 转换成 JSON_OBJECT 参数
 *
 * 例如：
 * IF(...) AS `cover`
 *
 * 转换成：
 * 'cover', IF(...)
 */
function toJsonObjectFields(fields) {
    return fields.map(field => {
        const match = field.match(/^([\s\S]+)\s+AS\s+`([^`]+)`$/i);
        if (!match) {
            (0, index_js_1.throwError)(`JSON select field requires an alias: ${field}`);
        }
        return `'${match[2]}', ${match[1]}`;
    });
}
function parseSelect(key, val, params, selectMode = conditional_js_1.SelectMode.select) {
    if (!val || typeof val !== "object" || Array.isArray(val)) {
        (0, index_js_1.throwError)(`"${selectMode}" operator at "${key}" requires an object.`);
    }
    if (!val.table || typeof val.table !== "string") {
        (0, index_js_1.throwError)(`"${selectMode}" operator at "${key}" requires a "table" property.`);
    }
    if (val.fields && !Array.isArray(val.fields)) {
        (0, index_js_1.throwError)(`"${selectMode}" operator at "${key}" requires a "fields" property as an array.`);
    }
    const aggregate = aggregateMap[selectMode];
    // 聚合操作必须指定且只能指定一个字段
    if (aggregate && (!val.fields || val.fields.length !== 1)) {
        (0, index_js_1.throwError)(`"${selectMode}" operator at "${key}" requires exactly one field.`);
    }
    // LIMIT
    let limitStr = "";
    if (val.limit !== undefined && val.limit !== null) {
        const limit = Number(val.limit);
        const offset = val.offset ? Number(val.offset) : 0;
        if (!Number.isInteger(limit) || limit < 0 ||
            !Number.isInteger(offset) || offset < 0) {
            (0, index_js_1.throwError)(`"${selectMode}" operator at "${key}" has an invalid limit or offset.`);
        }
        limitStr = ` LIMIT ${offset}, ${limit}`;
    }
    // JOIN
    let joinSql = "";
    let joinSelect = [];
    if (val.joins && Array.isArray(val.joins)) {
        const { joinSql: joinSqlStr, select: joinSelectStr, params: joinParams } = (0, parseJoin_js_1.default)(val.joins);
        params.push(...joinParams);
        joinSql = joinSqlStr;
        if (joinSelectStr.trim()) {
            joinSelect = joinSelectStr
                .split(/,\s*(?![^()]*\))/)
                .filter(Boolean);
        }
    }
    // WHERE
    let whereStr = "";
    if (val.query) {
        whereStr = ` WHERE ${(0, parseQuery_js_1.parse)(val.query, params)}`;
    }
    const tableSql = (0, index_js_1.quote)(val.table);
    // 普通字段
    const fields = val.fields?.map(field => (0, index_js_1.quote)(field)) ?? [];
    // JOIN 字段
    const jsonJoinFields = toJsonObjectFields(joinSelect);
    // JSON_OBJECT 参数
    const jsonFields = [
        ...fields.flatMap(field => {
            const alias = field.split(".").pop().replace(/`/g, "");
            return [`'${alias}'`, field];
        }),
        ...jsonJoinFields
    ];
    // JSON_OBJECT
    const jsonObject = `JSON_OBJECT(${jsonFields.join(", ")})`;
    // JSON_ARRAY
    if (val.type === "jsonArray") {
        return `
            SELECT IF(
                COUNT(*) = 0,
                JSON_ARRAY(),
                JSON_ARRAYAGG(\`__json\`)
            )
            FROM (
                SELECT ${jsonObject} AS \`__json\`
                FROM ${tableSql}
                ${joinSql}
                ${whereStr}
                ${limitStr}
            ) AS \`__json_rows\`
        `;
    }
    // JSON_OBJECT
    if (val.type === "jsonObject") {
        return `
            SELECT ${jsonObject}
            FROM ${tableSql}
            ${joinSql}
            ${whereStr}
            ${limitStr || " LIMIT 1"}
        `;
    }
    // COUNT
    if (val.type === "count") {
        return `
            SELECT COUNT(*)
            FROM ${tableSql}
            ${joinSql}
            ${whereStr}
        `;
    }
    // RAW
    if (val.type === "raw") {
        return fields.join(", ");
    }
    // 普通 SELECT / EXISTS / 聚合
    const select = [];
    if (selectMode === conditional_js_1.SelectMode.exists) {
        select.push("1");
    }
    else if (aggregate) {
        select.push(`${aggregate}(${fields.join(", ")})`);
    }
    else if (fields.length) {
        select.push(...fields);
    }
    select.push(...joinSelect);
    return `
        SELECT ${select.join(", ")}
        FROM ${tableSql}
        ${joinSql}
        ${whereStr}
        ${limitStr}
    `;
}
