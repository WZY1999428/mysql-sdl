import type { Logical } from "./logical.js";
import type { QueryOperators, Select } from "./conditional.js";
import type { UpdateAtomic } from "./updateAtomic.js";
import type { AggregateOps, PipelineStages, AggregationOptions, AggregateOption, AggregateFields, OneOrMany } from "./aggregate.js";
export { LogicalMap } from "./logical.js";
export { QueryOperatorMap } from "./conditional.js";
export { UpdateAtomicMap } from "./updateAtomic.js";
import type { Case } from "./case.js";
export type FieldExpression = {
    $select: Select;
} | {
    $case: Case;
};
export type Fields = (string | Record<string, FieldExpression>)[];
type QueryFields<T> = {
    [P in keyof T & string]?: T[P] | Condition<T[P]>;
};
type QueryLogical<T> = {
    [K in Logical]?: K extends '$not' ? Query<T> : Query<T>[];
};
type QuerySpecial = {
    $select?: Select;
    $exists?: Select;
    $count?: Select;
    $sum?: Select;
    $avg?: Select;
    $max?: Select;
    $min?: Select;
};
export type Query<T = any> = QueryFields<T> & QueryLogical<T> & QuerySpecial & Record<string, any>;
type Condition<V> = QueryOperators<V> & {
    $between?: [V, V];
    $in?: V[];
    $nin?: V[];
    $exists?: boolean;
    $like?: string;
    $nlike?: string;
    $case?: Case;
};
type ArithmeticOperator<T> = Partial<Record<keyof T, number>>;
export type Update<T> = {
    $set?: Partial<T>;
    $inc?: ArithmeticOperator<T>;
    $mul?: ArithmeticOperator<T>;
    dec?: ArithmeticOperator<T>;
    div?: ArithmeticOperator<T>;
    $max?: Partial<T>;
    $min?: Partial<T>;
    $concat?: Partial<Record<keyof T, string>>;
    $col?: Partial<Record<keyof T, string>>;
    $json?: string;
} & {
    [P in keyof T & string]?: T[P] | UpdateAtomic;
};
export type mathType = 'SUM' | 'AVG' | 'MAX' | 'MIN' | 'COUNT';
export type { Logical, QueryOperators, AggregateOps, PipelineStages, AggregateOption, AggregateFields, AggregationOptions, OneOrMany };
//# sourceMappingURL=index.d.ts.map