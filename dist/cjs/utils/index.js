"use strict";
/**
 * 为 SQL 标识符（表名、字段名）添加反引号
 * 支持格式: "name" -> "`name`"
 * 支持格式: "user.name" -> "`user`.`name`"
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.quote = quote;
exports.quoteAll = quoteAll;
exports.parseJson = parseJson;
exports.isObject = isObject;
exports.isStringArray = isStringArray;
exports.parseObjectKeys = parseObjectKeys;
exports.buildFields = buildFields;
exports.normalizeSqlValue = normalizeSqlValue;
const index_js_1 = require("../parse/index.js");
function quote(identifier) {
    // 1. 空值或 * 不处理
    if (!identifier || identifier === '*')
        return identifier;
    // 2. 新增：如果是函数、表达式或已包含空格/括号，直接原样返回（不加反引号）
    if (identifier.includes("(") || identifier.includes(")") || identifier.includes(" ")) {
        return identifier;
    }
    // 3. 清理已有的反引号，防止重复添加
    const clean = identifier.replace(/`/g, '');
    const parts = clean.split(".");
    // 4. 支持带点的路径（如 table.column -> `table`.`column`）
    return parts
        .map(part => (part === '*' ? '*' : `\`${part}\``)) // 确保 r.* 里的 * 不加反引号
        .join(".");
}
/**
 * 批量处理多个字段名
 */
function quoteAll(identifiers) {
    return identifiers.map(quote).join(', ');
}
function parseJson(key) {
    if (key.includes('.')) {
        const [column, ...path] = key.split('.');
        // 转换成 MySQL 的 JSON 提取语法：column->>'$.path'
        return `${quote(column)}->>'$.${path.join('.')}'`;
    }
    return `\`${key.replace(/`/g, '``')}\``;
}
function isObject(value) {
    return (value != null && typeof value === "object" && !Array.isArray(value));
}
function isStringArray(value) {
    return (Array.isArray(value) && value.every(item => typeof item === 'string'));
}
function parseObjectKeys(datas) {
    if (!isObject(datas))
        return '';
    let parts = [];
    const queue = [datas];
    while (queue.length) {
        const obj = queue.shift();
        // 1. 必须排序！保证 {a,b} 和 {b,a} 生成同一个 Key
        const keys = Object.keys(obj).sort();
        for (const key of keys) {
            const item = obj[key];
            // 2. 加入分隔符，防止 userid 和 user.id 混淆
            parts.push(key);
            if (item && typeof item === 'object') {
                if (Array.isArray(item)) {
                    parts.push('[]'); // 标识数组结构
                    for (const i of item) {
                        if (isObject(i))
                            queue.push(i);
                    }
                }
                else {
                    parts.push('{}'); // 标识嵌套结构
                    queue.push(item);
                }
            }
        }
    }
    // 3. 用特殊字符连接，确保唯一性
    return parts.join('|');
}
function buildFields(fields = "*") {
    if (fields === "*")
        return { fields: "*", params: [] };
    if (Array.isArray(fields)) {
        let params = [];
        const fieldList = fields.map(f => {
            if (typeof f === "string") {
                return quote(f);
            }
            else {
                // 处理 Select 类型
                const selectFields = [];
                for (const [key, obj] of Object.entries(f)) {
                    if (!obj.query) {
                        throw new Error("Select query is required");
                    }
                    if (!obj.table) {
                        throw new Error("Select table is required");
                    }
                    if (obj.type === 'count') {
                        obj.fields = [`COUNT(${obj.fields?.[0] || '*'})`];
                    }
                    else if (obj.type === "raw") {
                        if (!obj.fields || obj.fields.length === 0) {
                            throw new Error("Select fields is required for raw type");
                        }
                        obj.fields = [obj.fields[0]];
                    }
                    else if (obj.type === "jsonObject") {
                        obj.fields = [
                            `JSON_OBJECT(${obj.fields?.map((f) => `'${f}', ${f}`).join(', ')})`
                        ];
                    }
                    else if (obj.type === "jsonArray") {
                        obj.fields = [
                            `JSON_ARRAYAGG(JSON_OBJECT(${obj.fields?.map((f) => `'${f}', ${f}`).join(', ')}))`
                        ];
                    }
                    let limitStr = '';
                    if (obj.limit !== undefined && obj.limit !== null) {
                        const limit = Number(obj.limit);
                        const offset = obj.offset ? Number(obj.offset) : 0;
                        // 推荐使用 MySQL 兼容性最好的 "LIMIT offset, count" 格式
                        limitStr = ` LIMIT ${offset}, ${limit}`;
                    }
                    else {
                        // 标量子查询/默认保护：默认限制 1 条
                        limitStr = ' LIMIT 1';
                    }
                    const { sql, params: p } = (0, index_js_1.parseQuery)(obj.query);
                    params.push(...p);
                    selectFields.push(`(SELECT ${obj.fields?.join(', ') || '*'} FROM ${obj.table} WHERE ${sql} ${limitStr}) as ${key}`);
                }
                return selectFields.join(', ');
            }
        }).join(', ');
        ;
        return { fields: fieldList, params };
    }
    return { fields, params: [] }; // 如果是字符串且不是 *，建议也处理下或者直接透传
}
function normalizeSqlValue(value) {
    if (typeof value === "object" && value != null) {
        return JSON.stringify(value);
    }
    else {
        if (value === undefined || value === "")
            return null;
        else
            return value;
    }
}
