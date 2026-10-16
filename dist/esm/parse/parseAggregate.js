import { isObject, quote, buildFields } from "../utils/index.js";
import parseQuery from "./parseQuery.js";
import parseOrder from "./parseOrder.js";
import parseJoin from "./parseJoin.js";
export default function parseAggregate(table, options) {
    let sqlStr = "";
    let sleectSqlStr = "";
    const params = [];
    const { fields, specs, query, group, having, sort, joins, limit, offset } = options;
    if (Array.isArray(fields)) {
        if (!Array.isArray(fields)) {
            throw new Error("fields must be array");
        }
        const { fields: bFields, params: fieldParams } = buildFields(fields);
        params.push(...fieldParams);
        sleectSqlStr += ` ${bFields}  `;
    }
    else {
        sleectSqlStr += ` * `;
    }
    if (specs && Array.isArray(specs)) {
        const specsSql = [];
        for (const spec of specs) {
            if (!isObject(spec)) {
                throw new Error("each spec must be object");
            }
            if (spec.$max)
                specsSql.push(joinSpec("MAX", spec.$max, params));
            if (spec.$min)
                specsSql.push(joinSpec("MIN", spec.$min, params));
            if (spec.$sum)
                specsSql.push(joinSpec("SUM", spec.$sum, params));
            if (spec.$avg)
                specsSql.push(joinSpec("AVG", spec.$avg, params));
            if (spec.$count)
                specsSql.push(joinSpec("COUNT", spec.$count, params));
        }
        sqlStr += `, ${specsSql.join(", ")} `;
    }
    sqlStr += `FROM ${quote(table)} `;
    if (joins) {
        const { joinSql, select, params: joinParams } = parseJoin(joins);
        if (select)
            sleectSqlStr += `, ${select}`;
        // 4. 组装到主 SQL
        // 注意：JOIN 是紧跟在 FROM table 之后的
        sqlStr += ` ${joinSql}`;
        params.push(...joinParams);
    }
    if (query && Object.keys(query).length) {
        const { sql: sqlQuery, params: paramsQuery } = parseQuery(query);
        sqlStr += ` WHERE ${sqlQuery}`;
        params.push(...paramsQuery);
    }
    if (group && group.length) {
        sqlStr += ` GROUP BY ${group.join(', ')}`;
    }
    if (having && Object.keys(having).length) {
        const { sql: sqlQuery, params: paramsQuery } = parseQuery(having);
        sqlStr += ` HAVING ${sqlQuery}`;
        params.push(...paramsQuery);
    }
    if (sort) {
        sqlStr += ` ${parseOrder(sort, params)}`;
    }
    if (isFinite(limit)) {
        sqlStr += ` LIMIT ${limit}`;
    }
    if (isFinite(offset)) {
        sqlStr += ` OFFSET ${offset}`;
    }
    return { sql: `${sleectSqlStr} ${sqlStr}`, params };
}
function joinSpec(type, spec, params) {
    const parse = (spec) => {
        if (Array.isArray(spec)) {
            throw new Error("spec must be object or string");
        }
        if (isAggregateOption(spec)) {
            if (!spec.field) {
                throw new Error("field is required");
            }
            let str = "";
            let where = "";
            if (spec.where && Object.keys(spec.where).length) {
                const { sql, params: paramsWhere } = parseQuery(spec.where);
                where = ` WHERE ${sql} `;
                params.push(...paramsWhere);
            }
            if (spec.from)
                str += `( SELECT ${type}(${spec.field}) FROM ${quote(spec.from)}${where}) `;
            else
                str += ` ${type}(${spec.field}) `;
            if (spec.as)
                str += `AS ${quote(spec.as)} `;
            else
                str += `AS ${type.toLocaleLowerCase()}_${spec.field} `;
            return str;
        }
        else {
            return `${type}(${String(spec)}) AS ${type.toLocaleLowerCase()}_${String(spec)} `;
        }
    };
    if (Array.isArray(spec)) {
        const sql = [];
        for (const s of spec) {
            sql.push(parse(s));
        }
        return sql.join(' , ');
    }
    return parse(spec);
}
export function isAggregateOption(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
