import mysql2 from "mysql2";
import { format } from "sql-formatter";
const debug = {
    logger(sql: string, params: any[]) {
        console.log(sql, params);
    },
    loggerSql(sql: string, params: any[]) {
        const formattedSql = mysql2.format(sql, params);

        const prettySql = format(formattedSql, {
            language: "mysql",
            tabWidth: 4,
            keywordCase: "upper",
            linesBetweenQueries: 2,
        });
        console.log(prettySql);
    }
}

export default debug;