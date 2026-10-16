import parseCase from "./parseCase.js";
import { CaseMode } from "./operators/case.js";
import { isObject, quote } from "../utils/index.js";
export default function parseJsonArrayAgg(jsonArrayAgg) {
    let sqlStr = "";
    let params = [];
    let seleceSql = "";
    for (const item of jsonArrayAgg) {
        if (typeof item === "string") {
            sqlStr += ` JSON_ARRAYAGG(${quote(item)}) `;
            continue;
        }
        if (isObject(item)) {
            const { fields, as } = item;
            if (!fields) {
                throw new Error("fields is required in jsonArrayAgg object");
            }
            let expression = "";
            if (typeof fields === "string") {
                expression = `JSON_ARRAYAGG(${quote(fields)})`;
            }
            else if (isObject(fields)) {
                if (item.case) {
                    item.case.mode = CaseMode.JSON_ARRAYAGG;
                    item.case.$whens.forEach((item) => {
                        if (!item.then)
                            item.then = fields;
                    });
                    const { sql, params: caseParams } = parseCase(item.case);
                    params.push(...caseParams);
                    expression = `JSON_ARRAYAGG(${sql})`;
                }
                else {
                    const jsonObject = joinJsonObject(fields);
                    if (jsonObject) {
                        expression = `JSON_ARRAYAGG(JSON_OBJECT(${jsonObject}))`;
                    }
                }
            }
            if (expression) {
                sqlStr += `, ${expression}`;
                if (as) {
                    sqlStr += ` AS ${quote(as)}`;
                }
                sqlStr += " ";
            }
        }
    }
    return { sql: sqlStr, params };
}
export function joinJsonObject(fields) {
    const jsonObject = [];
    for (const [key, value] of Object.entries(fields)) {
        if (typeof value === "string") {
            jsonObject.push(`'${key}'`);
            jsonObject.push(quote(value));
        }
    }
    return jsonObject.join(" , ");
}
