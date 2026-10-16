import parseQuery from "./parseQuery.js";
import { isObject, throwError } from "../utils/index.js";
export default function parseCase(key, val, params) {
    if (!isObject(val)) {
        throwError(`"$case" operator at "${key}" requires an object.`);
    }
    const caseVal = val;
    if (!caseVal.branches || !Array.isArray(caseVal.branches)) {
        throwError(`"$case" operator at "${key}" requires an array of branches.`);
    }
    if (caseVal.else === undefined) {
        throwError(`"$case" operator at "${key}" requires an "else" branch.`);
    }
    const caseSegments = [];
    for (const branch of caseVal.branches) {
        const { sql: whenSql, params: whenParams } = parseQuery(branch.when);
        params.push(...whenParams);
        let thenSql;
        if (isObject(branch.then)) {
            const { sql: thenSqlTmp, params: thenParams } = parseQuery(branch.then);
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
    if (isObject(caseVal.else)) {
        const { sql: elseSql, params: elseParams } = parseQuery(caseVal.else);
        params.push(...elseParams);
        return `CASE ${caseSegments.join(' ')} ELSE ${elseSql} END `;
    }
    else {
        return `CASE ${caseSegments.join(' ')} ELSE ${caseVal.else} END `;
    }
}
