"use strict";
// 类型	大小	范围（有符号）	范围（无符号）	用途
// TINYINT	1 Bytes	(-128，127)	(0，255)	小整数值
// SMALLINT	2 Bytes	(-32 768，32 767)	(0，65 535)	大整数值
// MEDIUMINT	3 Bytes	(-8 388 608，8 388 607)	(0，16 777 215)	大整数值
// INT或INTEGER	4 Bytes	(-2 147 483 648，2 147 483 647)	(0，4 294 967 295)	大整数值
// BIGINT	8 Bytes	(-9,223,372,036,854,775,808，9 223 372 036 854 775 807)	(0，18 446 744 073 709 551 615)	极大整数值
// FLOAT	4 Bytes	(-3.402 823 466 E+38，-1.175 494 351 E-38)，0，(1.175 494 351 E-38，3.402 823 466 351 E+38)	0，(1.175 494 351 E-38，3.402 823 466 E+38)	单精度
// 浮点数值
// DOUBLE	8 Bytes	(-1.797 693 134 862 315 7 E+308，-2.225 073 858 507 201 4 E-308)，0，(2.225 073 858 507 201 4 E-308，1.797 693 134 862 315 7 E+308)	0，(2.225 073 858 507 201 4 E-308，1.797 693 134 862 315 7 E+308)	双精度
// 浮点数值
// DECIMAL	对DECIMAL(M,D) ，如果M>D，为M+2否则为D+2	依赖于M和D的值	依赖于M和D的值	小
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schema = exports.FieldSchemaBuilder = exports.DataType = void 0;
// 字符串类型
// 字符串类型指CHAR、VARCHAR、BINARY、VARBINARY、BLOB、TEXT、ENUM和SET。该节描述了这些类型如何工作以及如何在查询中使用这些类型。
// 类型	大小	用途
// CHAR	0-255 bytes	定长字符串
// VARCHAR	0-65535 bytes	变长字符串
// TINYBLOB	0-255 bytes	不超过 255 个字符的二进制字符串
// TINYTEXT	0-255 bytes	短文本字符串
// BLOB	0-65 535 bytes	二进制形式的长文本数据
// TEXT	0-65 535 bytes	长文本数据
// MEDIUMBLOB	0-16 777 215 bytes	二进制形式的中等长度文本数据
// MEDIUMTEXT	0-16 777 215 bytes	中等长度文本数据
// LONGBLOB	0-4 294 967 295 bytes	二进制形式的极大文本数据
// LONGTEXT	0-4 294 967 295 bytes	极大文本数据
// 日期和时间类型
// 表示时间值的日期和时间类型为DATETIME、DATE、TIMESTAMP、TIME和YEAR。
// 每个时间类型有一个有效值范围和一个"零"值，当指定不合法的MySQL不能表示的值时使用"零"值。
// TIMESTAMP类型有专有的自动更新特性，将在后面描述。
// 类型	大小
// ( bytes)	范围	格式	用途
// DATE	3	1000-01-01/9999-12-31	YYYY-MM-DD	日期值
// TIME	3	'-838:59:59'/'838:59:59'	HH:MM:SS	时间值或持续时间
// YEAR	1	1901/2155	YYYY	年份值
// DATETIME	8	'1000-01-01 00:00:00' 到 '9999-12-31 23:59:59'	YYYY-MM-DD hh:mm:ss	混合日期和时间值
// TIMESTAMP	4	
// '1970-01-01 00:00:01' UTC 到 '2038-01-19 03:14:07' UTC
// 结束时间是第 2147483647 秒，北京时间 2038-1-19 11:14:07，格林尼治时间 2038年1月19日 凌晨 03:14:07
const index_js_1 = require("../utils/index.js");
var DataType;
(function (DataType) {
    DataType["TinyInt"] = "TINYINT";
    DataType["SmallInt"] = "SMALLINT";
    DataType["Mediumint"] = "MEDIUMINT";
    DataType["Int"] = "INT";
    DataType["IntEger"] = "INTEGER";
    DataType["BigInt"] = "BIGINT";
    DataType["Float"] = "FLOAT";
    DataType["Double"] = "DOUBLE";
    DataType["Decimal"] = "DECIMAL";
    DataType["Char"] = "CHAR";
    DataType["VarChar"] = "VARCHAR";
    DataType["TinyBlob"] = "TINYBLOB";
    DataType["TinyText"] = "TINYTEXT";
    DataType["Blob"] = "BLOB";
    DataType["Text"] = "TEXT";
    DataType["MediumBlob"] = "MEDIUMBLOB";
    DataType["MediumText"] = "MEDIUMTEXT";
    DataType["LongBlob"] = "LONGBLOB";
    DataType["LongText"] = "LONGTEXT";
    DataType["Json"] = "JSON";
    DataType["Date"] = "DATE";
    DataType["Time"] = "TIME";
    DataType["Year"] = "YEAR";
    DataType["DateTime"] = "DATETIME";
    DataType["Timestamp"] = "TIMESTAMP";
})(DataType || (exports.DataType = DataType = {}));
const allDataTypes = new Set(Object.values(DataType));
class FieldSchemaBuilder {
    static Char(lengthOrOpt, opt) {
        const { length = 1, opt: finalOpt } = resolveCharParams(lengthOrOpt, opt);
        return { type: DataType.Char, length, ...sanitizeConstraints(finalOpt) };
    }
    static VarChar(lengthOrOpt, opt) {
        const { length = 255, opt: finalOpt } = resolveCharParams(lengthOrOpt, opt);
        return { type: DataType.VarChar, length, ...sanitizeConstraints(finalOpt) };
    }
    static Decimal(mOrOpt, dOrOpt, opt) {
        const { m = 10, d = 0, opt: finalOpt } = resolveNumberParams(mOrOpt, dOrOpt, opt);
        return { type: DataType.Decimal, m, d, ...sanitizeConstraints(finalOpt) };
    }
    static Float(mOrOpt, dOrOpt, opt) {
        const { m = 12, d = 4, opt: finalOpt } = resolveNumberParams(mOrOpt, dOrOpt, opt);
        return { type: DataType.Float, m, d, ...sanitizeConstraints(finalOpt) };
    }
    static Double(mOrOpt, dOrOpt, opt) {
        const { m = 22, d = 8, opt: finalOpt } = resolveNumberParams(mOrOpt, dOrOpt, opt);
        return { type: DataType.Double, m, d, ...sanitizeConstraints(finalOpt) };
    }
    static DateTime(fpsOrOpt, opt) {
        const { fps, opt: finalOpt } = resolveTimeParams(fpsOrOpt, opt);
        return { type: DataType.DateTime, fps, ...sanitizeConstraints(finalOpt) };
    }
    static Time(fpsOrOpt, opt) {
        const { fps, opt: finalOpt } = resolveTimeParams(fpsOrOpt, opt);
        return { type: DataType.Time, fps, ...sanitizeConstraints(finalOpt) };
    }
    static Timestamp(fpsOrOpt, opt) {
        const { fps, opt: finalOpt } = resolveTimeParams(fpsOrOpt, opt);
        return { type: DataType.Timestamp, fps, ...sanitizeConstraints(finalOpt) };
    }
    static Define(type, opt) {
        // 定义哪些类型有专门的快捷方法
        const specializedMethods = {
            [DataType.Char]: 'Char',
            [DataType.VarChar]: 'VarChar',
            [DataType.DateTime]: 'DateTime',
            [DataType.Time]: 'Time',
            [DataType.Timestamp]: 'Timestamp',
            [DataType.Decimal]: 'Decimal',
            [DataType.Float]: 'Float',
            [DataType.Double]: 'Double',
        };
        if (type in specializedMethods) {
            const methodName = specializedMethods[type];
            throwError(`[Schema Error] Please use FieldSchemaBuilder.${methodName}() instead of FieldSchemaBuilder.Define(DataType.${methodName})`);
        }
        if (!allDataTypes.has(type)) {
            throwError(`[Schema Error] Invalid data type: "${type}"`);
        }
        return { type, ...sanitizeConstraints(opt) };
    }
}
exports.FieldSchemaBuilder = FieldSchemaBuilder;
function throwError(msg) {
    // 在信息前加上 [Query Error] 前缀，让它在日志中更显眼
    const error = new Error(`\n[Query Error]\nCause: ${msg}\n`);
    error.name = "QueryValidationError";
    throw error;
}
function resolveTimeParams(fpsOrOpt, opt) {
    let fps = 0;
    let finalOpt = opt;
    // 逻辑判断：如果第一个参数是数字，它是 fps
    if (typeof fpsOrOpt === 'number') {
        fps = fpsOrOpt;
    }
    // 如果第一个参数是对象，它是 opt，此时第二个参数忽略
    else if (typeof fpsOrOpt === 'object' && fpsOrOpt !== null) {
        finalOpt = fpsOrOpt;
    }
    return { fps, opt: finalOpt };
}
function resolveCharParams(lengthOrOpt, opt) {
    let length = undefined;
    if (typeof lengthOrOpt === 'number')
        length = lengthOrOpt;
    if (typeof lengthOrOpt === 'object' && lengthOrOpt !== null)
        opt = lengthOrOpt;
    return { length, opt };
}
function resolveNumberParams(mOrOpt, dOrOpt, opt) {
    let m = undefined;
    let d = undefined;
    let finalOpt = opt;
    // 逻辑判断：如果第一个参数是数字，它是 m
    if (typeof mOrOpt === 'number') {
        m = mOrOpt;
    }
    // 逻辑判断：如果第二个参数是数字，它是 d
    if (typeof dOrOpt === 'number') {
        d = dOrOpt;
    }
    if (typeof dOrOpt === 'object' && dOrOpt !== null) {
        // 如果第一个参数是对象，它是 opt，此时第二个参数忽略
        finalOpt = dOrOpt;
    }
    else if (typeof mOrOpt === 'object' && mOrOpt !== null) {
        // 如果第二个参数是对象，它是 opt，此时第二个参数忽略
        finalOpt = mOrOpt;
    }
    return { m, d, opt: finalOpt };
}
// 过滤掉 null/undefined和非法字段
function sanitizeConstraints(opt = {}) {
    const { autoIncrement, nullable, primaryKey, unique, required, uniqueGroup, default: defaultValue, index } = opt;
    // 重新组合，只保留非 null/undefined 的属性
    return Object.fromEntries(Object.entries({
        autoIncrement, nullable, primaryKey, unique, required, uniqueGroup, default: defaultValue, index
    }).filter(([_, v]) => v !== undefined && v !== null));
}
class Schema {
    fields;
    tableFields = [];
    fieldsMap;
    hooks;
    table;
    constructor(fields, hooks) {
        this.fields = fields;
        this.fieldsMap = new Map();
        this.tableFields = [];
        for (const k in fields) {
            const field = fields[k];
            this.tableFields.push(k);
            this.fieldsMap.set(k, field.type);
        }
        this.hooks = hooks || {};
    }
    /**
         * 获取带有表名前缀的限定字段名（用于多表联查避免字段名冲突）
         *
         * @param fieldName - 需要限定的字段名称
         * @returns 拼接表名后的限定字段名（格式：`table.fieldName`）
         * @throws {Error} 当传入的字段名不存在于当前 Schema 中时抛出异常
         */
    qualifyField(fieldName) {
        if (!this.fieldsMap.has(fieldName)) {
            throw new Error(`field ${fieldName} not found`);
        }
        return `${this.table}.${fieldName}`;
    }
    /**
     * 批量获取带有表名前缀的限定字段名数组
     *
     * @param fieldNames - 需要限定的字段名称数组
     * @returns 拼接表名后的限定字段名数组（格式：`['table.field1', 'table.field2']`）
     * @throws {Error} 当传入的参数不是数组，或包含不存在的字段名时抛出异常
     */
    qualifyFields(fieldNames) {
        if (fieldNames && !Array.isArray(fieldNames))
            throw new Error(`fieldNames must be an array`);
        if (fieldNames)
            return fieldNames.map(name => this.qualifyField(name));
        else
            return this.tableFields.map(name => this.qualifyField(name));
    }
    toTableDefinition() {
        if (this.fieldsMap.size === 0) {
            throw new Error("no fields");
        }
        const definitionArr = [];
        const uniqueGroupMap = new Map();
        let alterTable;
        for (const name in this.fields) {
            const config = this.fields[name];
            if (config.type && typeof config.type === 'string') {
                config.type = config.type.toUpperCase();
            }
            const indexs = new Set();
            const { definition, alterTable: alterTableFromField } = this.parseFields(name, config, uniqueGroupMap, indexs);
            definitionArr.push(definition);
            if (alterTableFromField) {
                alterTable = alterTableFromField;
            }
        }
        for (const [groupName, columns] of uniqueGroupMap.entries()) {
            definitionArr.push(`UNIQUE KEY \`uk_${groupName}\` (${columns.join(", ")})`);
        }
        return {
            definition: definitionArr.join(", "),
            alterTable: alterTable
        };
    }
    parseFields(name, config, uniqueGroupMap, indexs) {
        let definition = "";
        let alterTable;
        if (!config || !config.type || !allDataTypes.has(config.type)) {
            throw new Error(`${name} value is undefined`);
        }
        const fieldName = (0, index_js_1.quote)(name);
        const fieldType = config.type;
        definition += `${fieldName} ${config.type}`;
        if (fieldType === DataType.Char || fieldType === DataType.VarChar) {
            if (config.length)
                definition += `(${config.length}) `;
        }
        else if (fieldType === DataType.Decimal || fieldType === DataType.Float || fieldType === DataType.Double) {
            if (config.m && config.d)
                definition += `(${config.m}, ${config.d}) `;
        }
        else if (fieldType === DataType.DateTime || fieldType === DataType.Time || fieldType === DataType.Timestamp) {
            if (config.fps)
                definition += `(${config.fps}) `;
        }
        if (config.primaryKey === true)
            definition += ' PRIMARY KEY';
        if (config.autoIncrement === true)
            definition += ' AUTO_INCREMENT';
        if (config.default !== undefined)
            definition += ` DEFAULT ${config.default}`;
        if (config.onUpdate)
            definition += ` ON UPDATE ${config.onUpdate}`;
        if (typeof config.autoIncrement === 'object' && config.autoIncrement?.enabled === true) {
            definition += ' AUTO_INCREMENT';
            alterTable = `ALTER TABLE \`${this.table}\` AUTO_INCREMENT = ${config.autoIncrement.start};`;
        }
        if (config.nullable === false)
            definition += ' NOT NULL';
        if (config.unique === true)
            definition += ' UNIQUE';
        if (config.index === true)
            indexs.add(`INDEX idx_${name}(${name})`);
        if (config.uniqueGroup && config.uniqueGroup.length > 0) {
            if (!Array.isArray(config.uniqueGroup) || config.uniqueGroup.some(item => typeof item !== 'string')) {
                throw new Error("uniqueGroup must be a string array");
            }
            config.uniqueGroup.forEach(groupName => {
                const existing = uniqueGroupMap.get(groupName) || [];
                existing.push(fieldName);
                uniqueGroupMap.set(groupName, existing);
            });
        }
        return {
            definition,
            alterTable
        };
    }
}
exports.Schema = Schema;
