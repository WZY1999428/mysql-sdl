import { Query, Fields } from "./index.js";
import { OrderBy } from "../parseOrder.js";

// 1. 聚合函数
const AggregateFunctionsMap = {
    "$min": "MIN",
    "$max": "MAX",
    "$sum": "SUM",
    "$avg": "AVG",
    "$count": "COUNT"
} as const;
export type AggregateOps = keyof typeof AggregateFunctionsMap;

// 2. 分组与过滤阶段 (用于 Aggregate 管道)
const PipelineStagesMap = {
    "$group": "GROUP BY",
    "$having": "HAVING"

} as const;



export type PipelineStages = keyof typeof PipelineStagesMap

export type AggregateOption<T> = {
    field: T
    as?: string,
    from?: string,
    where?: Query<unknown>
}

// 定义一个“单体或数组”的辅助类型
export type OneOrMany<T> = T | T[];

// 关键点：OneOrMany 让它可以是对象，也可以是对象数组

export type AggregateFields<T> = {
    [key in AggregateOps]?: OneOrMany<AggregateOption<T> | keyof T>;
} & {
    $count?: OneOrMany<Partial<{ field: keyof T | '*'; as: string; from: string; where: Query<unknown> }> | keyof T | '*'>;
}

type ColumnFields<T> = keyof T | string;

/** inner 内连接  left 左连接  right 右连接  full 全连接 self 自连接 */
type JoinType = 'inner' | 'left' | 'right' | 'full' | 'self';


export const JoinTypeMap = {
    inner: 'INNER JOIN',
    left: 'LEFT JOIN',
    right: 'RIGHT JOIN',
    full: 'FULL JOIN',
    self: 'self'
}




// 定义单个导出字段的映射类型
interface JoinSelectBase {
    fields?: Record<string, string>;

    /**
     * 用于 COUNT 判断的主键或判定字段
     * 若不传，则默认取 fields 中的第一个字段
     */
    countField?: string;
}

export type JoinSelectOption =
    | (JoinSelectBase & {
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

// 1. 定义基础的普通 Join
interface NormalJoin {
    table: string;
    on: Record<string, string>; // 必填
    type?: JoinType;
    as?: string;
    query?: Query<unknown>,
    /** 连表需要额外生成的映射字段/聚合字段（支持配置多个） */
    select?: JoinSelectOption[];
}

// 2. 定义特殊的 Self Join
interface SelfJoin {
    table: string;
    on?: Record<string, string>; // 可选
    type: 'self'; // 必须显式指定为 'self'
    as: string;   // 自连接必须有别名，否则字段全冲突
    query?: Query<unknown>,
    /** 连表需要额外生成的映射字段/聚合字段（支持配置多个） */
    select?: JoinSelectOption[];
}

// 3. 组合导出


export type JsonArrayAggFields = Record<string, string> | string



export type Join = NormalJoin | SelfJoin;

export type AggregationOptions<T> = {
    fields: Fields;      // 支持 ['u.id', 'p.title']
    specs?: AggregateFields<T>[];      // 选填：你要聚合哪些字段？
    query?: Query<T>;              // 选填：过滤条件 (WHERE)
    group?: string[];         // 选填：按什么分组？
    having?: Query<T>;             // 选填：分组后的过滤 (HAVING)
    sort?: OrderBy<T>; // 排序
    joins?: Join[];              // 连表
    limit?: number;
    offset?: number
}