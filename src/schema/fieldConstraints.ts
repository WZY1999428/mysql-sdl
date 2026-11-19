
import { DataType } from "./index.js"

type AutoIncrement = {
    enabled: true,
    start: number
}

export type FieldConstraints = {
    primaryKey?: boolean | undefined,
    snowflake?: boolean | undefined,
    autoIncrement?: boolean | AutoIncrement | undefined,
    default?: any | undefined,
    nullable?: boolean | undefined,
    index?: boolean | undefined,
    unique?: boolean | undefined,
    uniqueGroup?: string[] | undefined,
    onUpdate?: 'CURRENT_TIMESTAMP' | (string & {}) | undefined,
}


export type NumericSchema = FieldConstraints & {
    type: DataType.Decimal | DataType.Float | DataType.Double,
    m: number,
    d: number,
}

export type StringSchema = FieldConstraints & {
    type: DataType.Char | DataType.VarChar,
    length: number,
}

export type DateTimeSchema = FieldConstraints & {
    type: DataType.DateTime | DataType.Time | DataType.Timestamp,
    fps?: number,
}

export type OtherSchema = FieldConstraints & {
    type: Exclude<DataType, DataType.Char | DataType.VarChar | DataType.Decimal | DataType.Float | DataType.Double | DataType.DateTime | DataType.Time | DataType.Timestamp>,
}

export type FieldSchema = NumericSchema | StringSchema | DateTimeSchema | OtherSchema;


// 字符类型：CHAR(length), VARCHAR(length)
// 精确数值：DECIMAL(M, D)，FLOAT(M, D)，DOUBLE(M, D)
// 时间类型：DATETIME(fsp), TIME(fsp), TIMESTAMP(fsp)

export type SpecializedTypes = | DataType.Char | DataType.VarChar | DataType.DateTime | DataType.Time | DataType.Timestamp | DataType.Decimal | DataType.Float | DataType.Double;
// 2. 自动计算出 Define 允许的类型
export type DefineTpe = Exclude<DataType, SpecializedTypes>;
