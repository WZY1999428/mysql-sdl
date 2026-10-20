
import parseJoin from "../parse/parseJoin.js"
import { throwError, quote } from "../utils/index.js";

import type { Select } from "./operators/conditional.js";
import { SelectMode } from "./operators/conditional.js";
import { parse } from "./parseQuery.js"
export default function parseSelect(key: string, val: Select, params: any[], selectMode: SelectMode = SelectMode.select) {
    if (typeof val !== "object") {
        throwError(`"${selectMode}" operator at "${key}" requires an object.`);
    }

    if (!val.table || typeof val.table !== "string") {
        throwError(`"${selectMode}" operator at "${key}" requires a "table" property.`);
    }

    if (val.fields && !Array.isArray(val.fields)) {
        throwError(`"${selectMode}" operator at "${key}" requires a "fields" property as an array.`);
    }


    let limitStr = '';

    if (val.limit !== undefined && val.limit !== null) {
        const limit = Number(val.limit);
        const offset = val.offset ? Number(val.offset) : 0;

        // 推荐使用 MySQL 兼容性最好的 "LIMIT offset, count" 格式
        limitStr = ` LIMIT ${offset}, ${limit}`;
    }

    let joinSql = "";
    let select = ""

    if (val.joins && Array.isArray(val.joins)) {
        const { joinSql: joinSqlStr, select: joinSelect, params: joinParams } = parseJoin(val.joins);
        params.push(...joinParams);
        joinSql = joinSqlStr;
        select = joinSelect;

    }


    const fields = selectMode === SelectMode.exists ? "1" : val.fields?.map((f: string) => quote(f)).join(", ") || "";

    if (val.offset) {
        limitStr += ` OFFSET ${val.offset}`;
    }

    let whereStr = "";
    if (val.query) {
        whereStr = ` WHERE ${parse(val.query, params)}`;
    }

    return ` SELECT ${select ? `${select}, ` : ``} ${fields} FROM ${quote(val.table)} ${joinSql} ${whereStr} ${limitStr}  `;
}
