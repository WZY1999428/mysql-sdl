"use strict";
/**
 * 为 SQL 标识符（表名、字段名）添加反引号
 * 支持格式: "name" -> "`name`"
 * 支持格式: "user.name" -> "`user`.`name`"
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quote = quote;
exports.quoteAll = quoteAll;
exports.parseJson = parseJson;
exports.isObject = isObject;
exports.isStringArray = isStringArray;
exports.parseObjectKeys = parseObjectKeys;
exports.buildFields = buildFields;
exports.normalizeSqlValue = normalizeSqlValue;
exports.throwError = throwError;
const parseSelect_js_1 = __importDefault(require("../parse/parseSelect.js"));
const parseCase_js_1 = __importDefault(require("../parse/parseCase.js"));
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
                if ("$select" in f) {
                    console.log(f.$select);
                    const selectSql = (0, parseSelect_js_1.default)("", f.$select, params);
                    return ` ( ${selectSql.trim()} )`;
                }
                if ("$case" in f) {
                    const caseSql = (0, parseCase_js_1.default)("", f.$case, params);
                    return ` ( ${caseSql.trim()} )`;
                }
                // 处理 Select 类型
                const selectFields = [];
                for (const [key, obj] of Object.entries(f)) {
                    if ("$case" in obj) {
                        const caseSql = (0, parseCase_js_1.default)(key, obj.$case, params);
                        selectFields.push(`(${caseSql}) AS ${quote(key)}`);
                        continue;
                    }
                    if ("$select" in obj) {
                        const selectSql = (0, parseSelect_js_1.default)(key, obj.$select, params);
                        selectFields.push(` ( ${selectSql.trim()} ) AS ${quote(key)}`);
                        continue;
                    }
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
function throwError(msg) {
    // 在信息前加上 [Query Error] 前缀，让它在日志中更显眼
    const error = new Error(`\n[Query Error]\nCause: ${msg}\n`);
    error.name = "QueryValidationError";
    throw error;
}
