"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryOperatorMap = exports.SelectMode = void 0;
var SelectMode;
(function (SelectMode) {
    SelectMode["select"] = "$select";
    SelectMode["exists"] = "$exists";
})(SelectMode || (exports.SelectMode = SelectMode = {}));
exports.QueryOperatorMap = {
    '$eq': "=",
    '$ne': "!=",
    '$gt': ">",
    '$gte': ">=",
    '$lt': "<",
    '$lte': "<=",
    '$in': "IN",
    '$nin': "NOT IN",
    '$like': "LIKE",
    '$nlike': "NOT LIKE",
    "$between": "BETWEEN",
    "$select": "SELECT",
    "$exists": "EXISTS",
    "$col": "COL",
    "$case": "CASE"
};
