import { parseJson, quote, normalizeSqlValue } from "../utils/index.js";
function throwIfObject(key, value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`Invalid value for ${key} operator: ${JSON.stringify(value)}`);
    }
}
// 第一组：数学算术运算，生成 col = col op ?
const ArithmeticOperatorMap = {
    $inc: "+",
    $mul: "*",
    $dec: "-",
    $div: "/",
};
const ArithmeticOperatorMapKey = Object.keys(ArithmeticOperatorMap);
// 第二组：内置函数调用，生成 col = FUNC(col, ?)
const FunctionOperatorMap = {
    $max: "GREATEST",
    $min: "LEAST",
    $concat: "CONCAT"
};
const FunctionOperatorMapKey = Object.keys(FunctionOperatorMap);
const UpdateOperators = [...ArithmeticOperatorMapKey, ...FunctionOperatorMapKey];
export default function parseUpdate(data, schema) {
    const setSql = [];
    const params = [];
    const keys = Object.keys(data);
    for (const operator of keys) {
        const value = data[operator];
        if (UpdateOperators.includes(operator)) {
            throwIfObject(operator, value);
            for (const key in value) {
                if (FunctionOperatorMapKey.includes(operator)) {
                    setSql.push(`${quote(key)} = ${FunctionOperatorMap[operator]}(${quote(key)}, ?) `);
                }
                else if (ArithmeticOperatorMapKey.includes(operator)) {
                    setSql.push(`${quote(key)} = ${quote(key)} ${ArithmeticOperatorMap[operator]} ? `);
                }
                params.push(value[key]);
            }
            continue;
        }
        const fieldType = schema.fieldsMap.get(operator);
        if (!fieldType) {
            throw new Error(`Field ${operator} not found in schema`);
        }
        setSql.push(`${parseJson(operator)} = ?`);
        params.push(normalizeSqlValue(value));
    }
    return { sql: setSql.join(', '), params };
}
