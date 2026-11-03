"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFieldExpression = parseFieldExpression;
const parseSelect_js_1 = __importDefault(require("../parse/parseSelect.js"));
const index_js_1 = require("../utils/index.js");
const parseCase_js_1 = __importDefault(require("../parse/parseCase.js"));
const conditional_js_1 = require("./operators/conditional.js");
function parseFieldExpression(key, expression, params) {
    if ("$select" in expression) {
        const sql = (0, parseSelect_js_1.default)(key, expression.$select, params);
        return `( ${sql.trim()} ) AS ${(0, index_js_1.quote)(key)}`;
    }
    if ("$exists" in expression) {
        const sql = (0, parseSelect_js_1.default)(key, expression.$exists, params, conditional_js_1.SelectMode.exists);
        return `EXISTS ( ${sql.trim()} ) AS ${(0, index_js_1.quote)(key)}`;
    }
    if ("$case" in expression) {
        const sql = (0, parseCase_js_1.default)(key, expression.$case, params);
        return `( ${sql.trim()} ) AS ${(0, index_js_1.quote)(key)}`;
    }
    if ("$count" in expression) {
        const sql = (0, parseSelect_js_1.default)(key, expression.$count, params, conditional_js_1.SelectMode.count);
        return `( ${sql.trim()} ) AS ${(0, index_js_1.quote)(key)}`;
    }
    if ("$max" in expression) {
        const sql = (0, parseSelect_js_1.default)(key, expression.$max, params, conditional_js_1.SelectMode.max);
        return `( ${sql.trim()} ) AS ${(0, index_js_1.quote)(key)}`;
    }
    if ("$min" in expression) {
        const sql = (0, parseSelect_js_1.default)(key, expression.$min, params, conditional_js_1.SelectMode.min);
        return `( ${sql.trim()} ) AS ${(0, index_js_1.quote)(key)}`;
    }
    if ("$sum" in expression) {
        const sql = (0, parseSelect_js_1.default)(key, expression.$sum, params, conditional_js_1.SelectMode.sum);
        return `( ${sql.trim()} ) AS ${(0, index_js_1.quote)(key)}`;
    }
    if ("$avg" in expression) {
        const sql = (0, parseSelect_js_1.default)(key, expression.$avg, params, conditional_js_1.SelectMode.avg);
        return `( ${sql.trim()} ) AS ${(0, index_js_1.quote)(key)}`;
    }
    (0, index_js_1.throwError)(`Unsupported field expression at "${key}".`);
}
