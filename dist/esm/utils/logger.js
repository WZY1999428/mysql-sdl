import mysql2 from "mysql2";
import { format } from "sql-formatter";
const debug = {
    logger(sql, params) {
        console.log(sql, params);
    },
    loggerSql(sql, params) {
        const formattedSql = mysql2.format(sql, params);
        const prettySql = format(formattedSql, {
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
export default debug;
