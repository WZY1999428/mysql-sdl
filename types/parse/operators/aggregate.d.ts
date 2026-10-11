import { Query, Fields } from "./index.js";
import { OrderBy } from "../parseOrder.js";
declare const AggregateFunctionsMap: {
    readonly $min: "MIN";
    readonly $max: "MAX";
    readonly $sum: "SUM";
    readonly $avg: "AVG";
    readonly $count: "COUNT";
};
export type AggregateOps = keyof typeof AggregateFunctionsMap;
declare const PipelineStagesMap: {
    readonly $group: "GROUP BY";
    readonly $having: "HAVING";
};
export type PipelineStages = keyof typeof PipelineStagesMap;
export type AggregateOption<T> = {
    field: T;
    as?: string;
    from?: string;
    where?: Query<unknown>;
};
export type OneOrMany<T> = T | T[];
export type AggregateFields<T> = {
    [key in AggregateOps]?: OneOrMany<AggregateOption<T> | keyof T>;
} & {
    $count?: OneOrMany<Partial<{
        field: keyof T | '*';
        as: string;
        from: string;
        where: Query<unknown>;
    }> | keyof T | '*'>;
};
/** inner 内连接  left 左连接  right 右连接  full 全连接 self 自连接 */
type JoinType = 'inner' | 'left' | 'right' | 'full' | 'self';
export declare const JoinTypeMap: {
    inner: string;
    left: string;
    right: string;
    full: string;
    self: string;
};
interface JoinSelectBase {
    fields?: Record<string, string>;
    /**
     * 用于 COUNT 判断的主键或判定字段
     * 若不传，则默认取 fields 中的第一个字段
     */
    countField?: string;
}
export type JoinSelectOption = (JoinSelectBase & {
    /** 聚合模式：jsonArray */
    type: 'jsonArray' | 'count' | 'jsonObject' | "array";
    /** 生成结果的别名，必填 */
    as: string;
}) | (JoinSelectBase & {
    /** 原始字段 */
    type?: 'raw';
    /** 生成结果的别名，可选 */
    as?: string;
});
interface NormalJoin {
    table: string;
    on: Record<string, string>;
    type?: JoinType;
    as?: string;
    query: Query<unknown>;
    /** 连表需要额外生成的映射字段/聚合字段（支持配置多个） */
    select?: JoinSelectOption[];
}
interface SelfJoin {
    table: string;
    on?: Record<string, string>;
    type: 'self';
    as: string;
    query: Query<unknown>;
    /** 连表需要额外生成的映射字段/聚合字段（支持配置多个） */
    select?: JoinSelectOption[];
}
export type JsonArrayAggFields = Record<string, string> | string;
export type Join = NormalJoin | SelfJoin;
export type AggregationOptions<T> = {
    fields: Fields;
    specs?: AggregateFields<T>[];
    query?: Query<T>;
    group?: string[];
    having?: Query<T>;
    sort?: OrderBy<T>;
    joins?: Join[];
    limit?: number;
    offset?: number;
};
export {};
//# sourceMappingURL=aggregate.d.ts.map