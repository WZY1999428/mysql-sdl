
import parseJoin from "../parse/parseJoin.js"
import { throwError, quote } from "../utils/index.js";

import type { Select } from "./operators/conditional.js";
import { SelectMode } from "./operators/conditional.js";
import { parse } from "./parseQuery.js"


// 聚合函数映射
const aggregateMap = {
    [SelectMode.count]: "COUNT",
    [SelectMode.max]: "MAX",
    [SelectMode.min]: "MIN",
    [SelectMode.sum]: "SUM",
    [SelectMode.avg]: "AVG"
};

export default function parseSelect(
    key: string,
    val: Select,
    params: any[],
    selectMode: SelectMode = SelectMode.select
) {
    if (!val || typeof val !== "object" || Array.isArray(val)) {
        throwError(`"${selectMode}" operator at "${key}" requires an object.`);
    }

    if (!val.table || typeof val.table !== "string") {
        throwError(`"${selectMode}" operator at "${key}" requires a "table" property.`);
    }

    if (val.fields && !Array.isArray(val.fields)) {
        throwError(`"${selectMode}" operator at "${key}" requires a "fields" property as an array.`);
    }


    const aggregate = aggregateMap[selectMode as keyof typeof aggregateMap];

    // 聚合操作必须指定且只能指定一个字段
    if (aggregate && (!val.fields || val.fields.length !== 1)) {
        throwError(`"${selectMode}" operator at "${key}" requires exactly one field.`);
    }

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

    let joinSql = "";
    const select: string[] = [];

    if (val.joins && Array.isArray(val.joins)) {
        const {
            joinSql: joinSqlStr,
            select: joinSelect,
            params: joinParams
        } = parseJoin(val.joins);

        params.push(...joinParams);
        joinSql = joinSqlStr;

        if (joinSelect.trim() !== "") {
            select.push(joinSelect);
        }
    }

    const fields = val.fields?.map((f: string) => quote(f)).join(", ") || "";

    // SELECT 字段处理
    if (selectMode === SelectMode.exists) {
        select.push("1");
    } else if (aggregate) {
        select.push(`${aggregate}(${fields})`);
    } else if (fields) {
        select.push(fields);
    }

    let whereStr = "";

    if (val.query) {
        whereStr = ` WHERE ${parse(val.query, params)}`;
    }

    return ` SELECT ${select.join(", ")} FROM ${quote(val.table)} ${joinSql} ${whereStr} ${limitStr} `;
}