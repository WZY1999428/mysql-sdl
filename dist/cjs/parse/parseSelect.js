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
    const fields = selectMode === conditional_js_1.SelectMode.exists ? "1" : val.fields?.map((f) => (0, index_js_1.quote)(f)).join(", ") || "";
    if (fields)
        select += `, ${fields}`;
    if (val.offset) {
        limitStr += ` OFFSET ${val.offset}`;
    }
    let whereStr = "";
    if (val.query) {
        whereStr = ` WHERE ${(0, parseQuery_js_1.parse)(val.query, params)}`;
    }
    return ` SELECT ${select} FROM ${(0, index_js_1.quote)(val.table)} ${joinSql} ${whereStr} ${limitStr}  `;
}
