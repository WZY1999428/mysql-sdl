type Expr = {
    expr: any;
    order?: 'asc' | 'desc';
};
export type OrderBy<T> = Partial<Record<keyof T | string, 'asc' | 'desc'>> | {
    $expr: Expr[];
};
export default function parseOrder<T>(order: OrderBy<T>, params?: any[]): string;
export {};
//# sourceMappingURL=parseOrder.d.ts.map