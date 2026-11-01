import type { OrderBy } from "../parse/parseOrder.js"
export type { AggregationOptions } from "../parse/operators/index.js"
import type { Query, Fields } from "../parse/operators/index.js"
import type { Join } from "../parse/operators/aggregate.js"


export type FindOneOptions<T> = {
    // 字段
    fields?: Fields,
    // 排序
    sort?: OrderBy<T>
}

export type FindOptions<T> = FindOneOptions<T> & {
    /** 分页 */
    limit?: number,
    /** 偏移 */
    offset?: number,
}

export type InsertOptions = {
    /** 忽略冲突 (INSERT IGNORE) */
    ignore?: boolean;
    /** 如果存在冲突，则更新这些字段。如果是 true，则更新所有传入字段。 */
    upsert?: boolean | string[];
}

export type insertManyOptions = {
    batchSize?: number
} & InsertOptions


export type UpdateOptions = {
    // Update operations don't support upsert (use insert with upsert option instead)
    upsert?: boolean;
}



export type MathOptions<T> = {
    query?: Query<T>,
    field?: string,
    distinct?: boolean,
    joins?: Join[]
}