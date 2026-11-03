
import type { FieldExpression } from "../parse/operators/index.js"
import parseSelect from "../parse/parseSelect.js";
import { quote, throwError } from "../utils/index.js";
import parseCase from "../parse/parseCase.js";
import { SelectMode, Select } from "./operators/conditional.js";

export function parseFieldExpression(
    key: string,
    expression: FieldExpression,
    params: any[]
): string {

    if ("$select" in expression) {
        const sql = parseSelect(key, expression.$select, params);
        return `( ${sql.trim()} ) AS ${quote(key)}`;
    }

    if ("$exists" in expression) {
        const sql = parseSelect(
            key,
            expression.$exists,
            params,
            SelectMode.exists
        );

        return `EXISTS ( ${sql.trim()} ) AS ${quote(key)}`;
    }

    if ("$case" in expression) {
        const sql = parseCase(key, expression.$case, params);
        return `( ${sql.trim()} ) AS ${quote(key)}`;
    }

    if ("$count" in expression) {
        const sql = parseSelect(key, expression.$count, params, SelectMode.count);
        return `( ${sql.trim()} ) AS ${quote(key)}`;
    }

    if ("$max" in expression) {
        const sql = parseSelect(key, expression.$max, params, SelectMode.max);
        return `( ${sql.trim()} ) AS ${quote(key)}`;
    }

    if ("$min" in expression) {
        const sql = parseSelect(key, expression.$min, params, SelectMode.min);
        return `( ${sql.trim()} ) AS ${quote(key)}`;
    }

    if ("$sum" in expression) {
        const sql = parseSelect(key, expression.$sum, params, SelectMode.sum);
        return `( ${sql.trim()} ) AS ${quote(key)}`;
    }

    if ("$avg" in expression) {
        const sql = parseSelect(key, expression.$avg, params, SelectMode.avg);
        return `( ${sql.trim()} ) AS ${quote(key)}`;
    }

    throwError(`Unsupported field expression at "${key}".`);
}
