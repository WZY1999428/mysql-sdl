import { isObject, quote } from "../utils/index.js";
import parseQuery from "./parseQuery.js";
import { JoinTypeMap, } from "./operators/aggregate.js";
const joinOperators = {
    $eq: "=",
    $ne: "!=",
    $gt: ">",
    $gte: ">=",
    $lt: "<",
    $lte: "<=",
    $like: "LIKE",
    $notLike: "NOT LIKE",
    $in: "IN",
    $nin: "NOT IN",
    $isNull: "IS NULL",
    $isNotNull: "IS NOT NULL",
};
function parseJoin(joins) {
    if (!Array.isArray(joins)) {
        throw new Error("joins must be array");
    }
    let asIndex = 0;
    const params = [];
    const joinsList = joins.map(item => {
        let select = [];
        if (!isObject(item)) {
            throw new Error("joins must be array of object");
        }
        if (!item.table) {
            throw new Error("table is required");
        }
        if (!isObject(item.on) && item.type != 'self') {
            throw new Error("on is required");
        }
        // 1. 生成别名：优先用用户的，没有就自增
        const tableAlias = item.as || `t${asIndex++}`;
        if (item.select && Array.isArray(item.select)) {
            select = parseJoinSelect(item);
        }
        // 2. 解析 ON 条件 (这里的 value 以后记得接 $ref 逻辑)
        let onStr = "";
        if (item.on) {
            onStr = Object.entries(item.on).map(([key, value]) => {
                // 字段 = 字段
                if (typeof value === "string") {
                    return `${quote(key)} = ${quote(value)}`;
                }
                // 操作符条件
                if (value && typeof value === "object") {
                    return Object.entries(value).map(([operator, operand]) => {
                        const sqlOperator = joinOperators[operator];
                        if (!sqlOperator) {
                            throw new Error(`Unsupported JOIN operator: ${operator}`);
                        }
                        // IS NULL / IS NOT NULL
                        if (operator === "$isNull" || operator === "$isNotNull") {
                            return `${quote(key)} ${sqlOperator}`;
                        }
                        // IN / NOT IN
                        if (operator === "$in" || operator === "$nin") {
                            params.push(...operand);
                            return `${quote(key)} ${sqlOperator} (${operand.map(() => "?").join(", ")})`;
                        }
                        // 普通操作符
                        params.push(operand);
                        return `${quote(key)} ${sqlOperator} ?`;
                    }).join(" AND ");
                }
                throw new Error(`Invalid JOIN condition: ${key}`);
            }).join(" AND ");
        }
        let whereStr = "";
        if (item.query) {
            const { sql: querySql, params: queryParams } = parseQuery(item.query);
            params.push(...queryParams);
            whereStr = ` WHERE ${querySql}`;
        }
        const joinOn = onStr ? ` ON ${onStr}` : "";
        // 3. 根据类型生成 SQL
        if (item.type === 'self') {
            return { sql: ` INNER JOIN ${quote(item.table)} AS ${quote(tableAlias)}${joinOn} ${whereStr}`, select };
        }
        else {
            const joinType = JoinTypeMap[item.type || 'inner']; // 默认 inner
            return { sql: ` ${joinType} ${quote(item.table)} AS ${quote(tableAlias)}${joinOn}  ${whereStr}`, select };
        }
    });
    return {
        joinSql: joinsList.map(it => it.sql).join("  "),
        select: joinsList.flatMap(it => it.select).join(" , "),
        params
    };
}
function parseJoinSelect(joinItem) {
    if (!joinItem.select || !Array.isArray(joinItem.select)) {
        return [];
    }
    // 获取别名
    const alias = joinItem.as || joinItem.table;
    return joinItem.select.map(item => {
        // 1. 如果是 JSON 数组聚合类型（默认）
        if (item.type === 'jsonArray' || item.type === 'jsonObject' || !item.type) {
            if (!item.fields || Object.keys(item.fields).length === 0) {
                throw new Error(`select fields is required for json_array on table ${joinItem.table}`);
            }
            // 提取主键或任意第一个字段作为 COUNT 的依据（例如 r.id）
            const firstField = item.countField || Object.values(item.fields)[0];
            if (!firstField) {
                throw new Error(`select fields is required for json_array on table ${joinItem.table}`);
            }
            // 组装 JSON_OBJECT('id', r.id, 'name', r.name)
            const jsonObjectArgs = Object.entries(item.fields)
                .map(([key, val]) => `'${key}', ${quote(val)}`)
                .join(", ");
            if (item.type === "jsonObject") {
                if (!item.as) {
                    throw new Error(`select as is required for jsonObject type on table ${joinItem.table}`);
                }
                // 生成你需要的 IF(...) 语句
                return `IF(ISNULL(${quote(firstField)}) , NULL, JSON_OBJECT(${jsonObjectArgs})) AS ${quote(item.as)}`;
            }
            else {
                if (!item.as) {
                    throw new Error(`select as is required for jsonArray type on table ${joinItem.table}`);
                }
                // 生成你需要的 IF(...) 语句
                return `IF(COUNT(${quote(firstField)}) = 0, JSON_ARRAY(), JSON_ARRAYAGG(JSON_OBJECT(${jsonObjectArgs}))) AS ${quote(item.as)}`;
            }
        }
        // 2. 如果是 非对象数组内容
        if (item.type === "array") {
            if (!item.as) {
                throw new Error(`select as is required for array type on table ${joinItem.table}`);
            }
            const countTarget = item.fields ? Object.values(item.fields)[0] : `${alias}.id`;
            return `IF(COUNT(${quote(countTarget)}) = 0, JSON_ARRAY(), JSON_ARRAYAGG(${quote(countTarget)})) AS ${quote(item.as)}`;
        }
        // 2. 如果只是简单 COUNT
        if (item.type === 'count') {
            if (!item.as) {
                throw new Error(`select as is required for count type on table ${joinItem.table}`);
            }
            const countTarget = item.fields ? Object.values(item.fields)[0] : `${alias}.id`;
            return `COUNT(${quote(countTarget)}) AS ${quote(item.as)}`;
        }
        // 3. 🌟 新增：RAW（原始字段类型），不进行聚合，直接查出字段
        if (item.type === 'raw') {
            if (!item.fields || Object.keys(item.fields).length === 0) {
                throw new Error(`select fields is required for raw type on table ${joinItem.table}`);
            }
            // 组装成：`user`.`username` AS `username`, `user`.`age` AS `age`
            return Object.entries(item.fields)
                .map(([aliasName, fieldPath]) => `${quote(fieldPath)} AS ${quote(aliasName)}`)
                .join(", ");
        }
        throw new Error(`Unsupported join select type: ${item.type}`);
    });
}
export default parseJoin;
