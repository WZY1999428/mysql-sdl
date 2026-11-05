import parseJoin from "../parse/parseJoin.js";
import { throwError, quote } from "../utils/index.js";
import { SelectMode } from "./operators/conditional.js";
import { parse } from "./parseQuery.js";
// 聚合函数映射
const aggregateMap = {
    [SelectMode.count]: "COUNT",
    [SelectMode.max]: "MAX",
    [SelectMode.min]: "MIN",
    [SelectMode.sum]: "SUM",
    [SelectMode.avg]: "AVG"
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
            throwError(`JSON select field requires an alias: ${field}`);
        }
        return `'${match[2]}', ${match[1]}`;
    });
}
export default function parseSelect(key, val, params, selectMode = SelectMode.select) {
    if (!val || typeof val !== "object" || Array.isArray(val)) {
        throwError(`"${selectMode}" operator at "${key}" requires an object.`);
    }
    if (!val.table || typeof val.table !== "string") {
        throwError(`"${selectMode}" operator at "${key}" requires a "table" property.`);
    }
    if (val.fields && !Array.isArray(val.fields)) {
        throwError(`"${selectMode}" operator at "${key}" requires a "fields" property as an array.`);
    }
    const aggregate = aggregateMap[selectMode];
    // 聚合操作必须指定且只能指定一个字段
    if (aggregate && (!val.fields || val.fields.length !== 1)) {
        throwError(`"${selectMode}" operator at "${key}" requires exactly one field.`);
    }
    // LIMIT
    let limitStr = "";
    if (val.limit !== undefined && val.limit !== null) {
        const limit = Number(val.limit);
        const offset = val.offset ? Number(val.offset) : 0;
        if (!Number.isInteger(limit) || limit < 0 ||
            !Number.isInteger(offset) || offset < 0) {
            throwError(`"${selectMode}" operator at "${key}" has an invalid limit or offset.`);
        }
        limitStr = ` LIMIT ${offset}, ${limit}`;
    }
    // JOIN
    let joinSql = "";
    let joinSelect = [];
    if (val.joins && Array.isArray(val.joins)) {
        const { joinSql: joinSqlStr, select: joinSelectStr, params: joinParams } = parseJoin(val.joins);
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
        whereStr = ` WHERE ${parse(val.query, params)}`;
    }
    const tableSql = quote(val.table);
    // 普通字段
    const fields = val.fields?.map(field => quote(field)) ?? [];
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
    if (selectMode === SelectMode.exists) {
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
