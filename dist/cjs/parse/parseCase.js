"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = parseCase;
const parseQuery_js_1 = __importDefault(require("./parseQuery.js"));
const index_js_1 = require("../utils/index.js");
function parseCase(key, val, params) {
    if (!(0, index_js_1.isObject)(val)) {
        (0, index_js_1.throwError)(`"$case" operator at "${key}" requires an object.`);
    }
    const caseVal = val;
    if (!caseVal.branches || !Array.isArray(caseVal.branches)) {
        (0, index_js_1.throwError)(`"$case" operator at "${key}" requires an array of branches.`);
    }
    if (caseVal.else === undefined) {
        (0, index_js_1.throwError)(`"$case" operator at "${key}" requires an "else" branch.`);
    }
    const caseSegments = [];
    for (const branch of caseVal.branches) {
        const { sql: whenSql, params: whenParams } = (0, parseQuery_js_1.default)(branch.when);
        params.push(...whenParams);
        let thenSql;
        if ((0, index_js_1.isObject)(branch.then)) {
            const { sql: thenSqlTmp, params: thenParams } = (0, parseQuery_js_1.default)(branch.then);
            params.push(...thenParams);
            thenSql = thenSqlTmp;
        }
        else {
            thenSql = branch.then;
        }
        caseSegments.push(`
                           WHEN ${whenSql}
                           THEN ${thenSql}
                        `);
    }
    if ((0, index_js_1.isObject)(caseVal.else)) {
        const { sql: elseSql, params: elseParams } = (0, parseQuery_js_1.default)(caseVal.else);
        params.push(...elseParams);
        return `CASE ${caseSegments.join(' ')} ELSE ${elseSql} END `;
    }
    else {
        return `CASE ${caseSegments.join(' ')} ELSE ${caseVal.else} END `;
    }
}
