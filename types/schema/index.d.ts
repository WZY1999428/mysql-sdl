import { ResultSetHeader } from "mysql2/promise";
import { FieldConstraints, FieldSchema, DefineTpe } from "./fieldConstraints.js";
import { Query, AggregationOptions } from "../parse/operators/index.js";
import { QueryResult } from "mysql2/promise";
export declare enum DataType {
    TinyInt = "TINYINT",
    SmallInt = "SMALLINT",
    Mediumint = "MEDIUMINT",
    Int = "INT",
    IntEger = "INTEGER",
    BigInt = "BIGINT",
    Float = "FLOAT",
    Double = "DOUBLE",
    Decimal = "DECIMAL",
    Char = "CHAR",
    VarChar = "VARCHAR",
    TinyBlob = "TINYBLOB",
    TinyText = "TINYTEXT",
    Blob = "BLOB",
    Text = "TEXT",
    MediumBlob = "MEDIUMBLOB",
    MediumText = "MEDIUMTEXT",
    LongBlob = "LONGBLOB",
    LongText = "LONGTEXT",
    Json = "JSON",
    Date = "DATE",
    Time = "TIME",
    Year = "YEAR",
    DateTime = "DATETIME",
    Timestamp = "TIMESTAMP"
}
export declare class FieldSchemaBuilder {
    static Char(opt?: FieldConstraints): FieldSchema;
    static Char(length: number, opt?: FieldConstraints): FieldSchema;
    static VarChar(opt?: FieldConstraints): FieldSchema;
    static VarChar(length: number, opt?: FieldConstraints): FieldSchema;
    static Decimal(opt?: FieldConstraints): FieldSchema;
    static Decimal(m: number, opt?: FieldConstraints): FieldSchema;
    static Decimal(m: number, d: number, opt?: FieldConstraints): FieldSchema;
    static Float(opt?: FieldConstraints): FieldSchema;
    static Float(m: number, opt?: FieldConstraints): FieldSchema;
    static Float(m: number, d: number, opt?: FieldConstraints): FieldSchema;
    static Double(opt?: FieldConstraints): FieldSchema;
    static Double(m: number, opt?: FieldConstraints): FieldSchema;
    static Double(m: number, d: number, opt?: FieldConstraints): FieldSchema;
    static DateTime(opt?: FieldConstraints): FieldSchema;
    static DateTime(fps: number, opt?: FieldConstraints): FieldSchema;
    static Time(fpsOrOpt?: FieldConstraints): FieldSchema;
    static Time(fpsOrOpt: number, opt?: FieldConstraints): FieldSchema;
    static Timestamp(opt?: FieldConstraints): FieldSchema;
    static Timestamp(fps: number, opt?: FieldConstraints): FieldSchema;
    static Define(type: DefineTpe, opt?: FieldConstraints): FieldSchema;
}
type FieldsMap<T> = Record<keyof T, FieldSchema>;
type QueryResultItem<T> = T[] | T | QueryResult;
type SchemaHooks<T, P = any> = {
    beforeInsert?: (data: T) => Promise<T | void>;
    afterInsert?: (data: T) => Promise<ResultSetHeader>;
    beforeUpdate?: (query: Query<T>, data: Partial<T>) => Promise<[Query<T>, Partial<T>]>;
    afterUpdate?: (data: T) => Promise<ResultSetHeader | any | void>;
    beforeDelete?: (query: Query<T>) => Promise<Query<T>>;
    afterDelete?: (data: T) => Promise<ResultSetHeader>;
    beforeFind?: (query: Query<T>) => Promise<Query<T>>;
    afterFind?: (results: QueryResultItem<T>) => Promise<QueryResultItem<T>>;
    beforeAggregate?: (query: AggregationOptions<T>) => Promise<AggregationOptions<T>>;
    AFterAggregate?: (results: QueryResultItem<P>) => Promise<QueryResultItem<P>>;
};
export declare class Schema<T> {
    fields: FieldsMap<T>;
    private _tableFields;
    fieldsMap: Map<string, DataType>;
    hooks: SchemaHooks<T>;
    table?: string;
    constructor(fields: FieldsMap<T>, hooks?: SchemaHooks<T>);
    /**
         * 获取带有表名前缀的限定字段名（用于多表联查避免字段名冲突）
         *
         * @param fieldName - 需要限定的字段名称
         * @returns 拼接表名后的限定字段名（格式：`table.fieldName`）
         * @throws {Error} 当传入的字段名不存在于当前 Schema 中时抛出异常
         */
    qualifyField(fieldName: string): string;
    /**
     * 批量获取带有表名前缀的限定字段名数组
     *
     * @param fieldNames - 需要限定的字段名称数组
     * @returns 拼接表名后的限定字段名数组（格式：`['table.field1', 'table.field2']`）
     * @throws {Error} 当传入的参数不是数组，或包含不存在的字段名时抛出异常
     */
    qualifyFields(fieldNames?: string[]): string[];
    toTableDefinition(): {
        definition: string;
        alterTable?: string | undefined;
    };
    parseFields(name: string, config: FieldSchema, uniqueGroupMap: Map<string, string[]>, indexs: Set<string>): {
        definition: string;
        alterTable?: string | undefined;
    };
}
export {};
//# sourceMappingURL=index.d.ts.map