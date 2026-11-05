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
function parseSelect(key, val, params, selectMode = conditional_js_1.SelectMode.select) {
    if (!val || typeof val !== "object" || Array.isArray(val)) {
        (0, index_js_1.throwError)(`"${selectMode}" operator at "${key}" requires an object.`);
    }
    if (!val.table || typeof val.table !== "string") {
        (0, index_js_1.throwError)(`"${selectMode}" operator at "${key}" requires a "table" property.`);
    }
    if (val.fields && !Array.isArray(val.fields) && typeof val.fields !== "object") {
        (0, index_js_1.throwError)(`"${selectMode}" operator at "${key}" requires "fields" property.`);
    }
    const aggregate = aggregateMap[selectMode];
    // 聚合操作必须指定且只能指定一个字段
    if (aggregate && (!Array.isArray(val.fields) || val.fields.length !== 1)) {
        (0, index_js_1.throwError)(`"${selectMode}" operator at "${key}" requires exactly one field.`);
    }
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
    let joinSql = "";
    const select = [];
    if (val.joins && Array.isArray(val.joins)) {
        const { joinSql: joinSqlStr, select: joinSelect, params: joinParams } = (0, parseJoin_js_1.default)(val.joins);
        params.push(...joinParams);
        joinSql = joinSqlStr;
        if (joinSelect.trim() !== "") {
            select.push(joinSelect);
        }
    }
    // ==================== 核心修改：处理不同 type (jsonObject / jsonArray 等) ====================
    if (val.type === "jsonObject") {
        // 如果 fields 是对象，例如 { url: "upload.url", id: "upload.id" }
        // 转换成 MySQL 的 JSON_OBJECT('url', `upload`.`url`, 'id', `upload`.`id`) AS `alias`
        if (val.fields && typeof val.fields === "object" && !Array.isArray(val.fields)) {
            const pairs = Object.entries(val.fields)
                .map(([k, v]) => `'${k}', ${v}`)
                .join(", ");
            const jsonExpr = `JSON_OBJECT(${pairs})`;
            const alias = val.alias ? ` AS ${(0, index_js_1.quote)(val.alias)}` : "";
            select.push(`${jsonExpr}${alias}`);
        }
    }
    else if (val.type === "jsonArray") {
        // 后续如果需要支持 jsonArray 可以在这里扩展
    }
    else {
        // 普通字段处理
        const fields = Array.isArray(val.fields)
            ? val.fields.map((f) => (0, index_js_1.quote)(f)).join(", ")
            : "";
        if (selectMode === conditional_js_1.SelectMode.exists) {
            select.push("1");
        }
        else if (aggregate) {
            select.push(`${aggregate}(${fields})`);
        }
        else if (fields) {
            select.push(fields);
        }
    }
    // ===========================================================================================
    let whereStr = "";
    if (val.query) {
        whereStr = ` WHERE ${(0, parseQuery_js_1.parse)(val.query, params)}`;
    }
    return ` SELECT ${select.join(", ")} FROM ${(0, index_js_1.quote)(val.table)} ${joinSql} ${whereStr} ${limitStr} `;
}
