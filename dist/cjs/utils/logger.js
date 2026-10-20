"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql2_1 = __importDefault(require("mysql2"));
const sql_formatter_1 = require("sql-formatter");
const debug = {
    logger(sql, params) {
        console.log(sql, params);
    },
    loggerSql(sql, params) {
        const formattedSql = mysql2_1.default.format(sql, params);
        const prettySql = (0, sql_formatter_1.format)(formattedSql, {
            language: "mysql",
            tabWidth: 4,
            keywordCase: "upper",
            linesBetweenQueries: 2,
        });
        console.log("\n========== SQL DEBUG ==========\n");
        console.log(prettySql);
        console.log("\n===============================\n");
    }
};
exports.default = debug;
