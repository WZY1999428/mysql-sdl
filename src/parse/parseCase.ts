import parseQuery from "./parseQuery.js";
import { isObject, throwError } from "../utils/index.js";
import type { Case } from "./operators/case.js";

export default  function parseCase(key: string, val: Case, params: any[]): string {
    if (!isObject(val)) {
        throwError(`"$case" operator at "${key}" requires an object.`);
    }
    const caseVal = val as Case;
    if (!caseVal.branches || !Array.isArray(caseVal.branches)) {
        throwError(`"$case" operator at "${key}" requires an array of branches.`);
    }
    if (caseVal.else === undefined) {
        throwError(`"$case" operator at "${key}" requires an "else" branch.`);
    }

    const caseSegments: string[] = [];

    for (const branch of caseVal.branches) {
        const { sql: whenSql, params: whenParams } = parseQuery(branch.when);
        params.push(...whenParams);
        let thenSql: string;

        if (isObject(branch.then)) {
            const { sql: thenSqlTmp, params: thenParams } = parseQuery(branch.then);
            params.push(...thenParams);
            thenSql = thenSqlTmp;
        } else {
            thenSql = branch.then as string;
        }

        caseSegments.push(`
                           WHEN ${whenSql}
                           THEN ${thenSql}
                        `)
    }

    if (isObject(caseVal.else)) {
        const { sql: elseSql, params: elseParams } = parseQuery(caseVal.else);
        params.push(...elseParams);
        return `CASE ${caseSegments.join(' ')} ELSE ${elseSql} END `;
    } else {
        return `CASE ${caseSegments.join(' ')} ELSE ${caseVal.else} END `;
    }
}

