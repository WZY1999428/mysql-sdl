
import { userRole, songModel } from "./database.ts";

// 辅助函数 

console.log(userRole.qualifyFields(["id", "userId"])) // [ 'user_role.id', 'user_role.userId' ]
console.log(userRole.qualifyField("userId")) //   'user_role.userId'

// // 普通查询
// const result = await userRole.aggregate({
//     // 需要显示的字段
//     fields: ["id", "userId"],
//     // 查询条件
//     query: { "id": { $eq: 10004 } } as any,
//     // 排序方式
//     sort: { "id": "asc" },

// })


// 连表查询 
// const joinsResult = await userRole.aggregate({
//     // 需要显示的字段
//     fields: ["user.id"],
//     // 查询条件
//     query: {
//         "user_role.id": { $eq: 10004 }
//     },
//     // 分组
//     group: ["user.id"] as any,
//     // 排序方式
//     sort: { "user.id": "asc" },
//     joins: [
//         {
//             // 连接的表
//             table: "system_user",
//             // 连接类型 inner self left right   
//             type: "inner",
//             // 连接后的别名  不传 t1 t2 t3 依次累加
//             as: "user",
//             // 连接条件
//             on: { "user_role.userId": "user.id" },
//             // 连接后的字段  jsonArray count raw

//             /**
//              * type含义拼接生成的 SQL 示例最终输出结果格式
//              * jsonArray一对多/多对多聚合数组IF(COUNT(r.id)=0, JSON_ARRAY(), JSON_ARRAYAGG(...))roles: [{ id: 1, name: 'admin' }]
//              * count统计关联行数COUNT(r.id) AS roleCountroleCount: 3
//              * raw传统连表打平查字段r.name AS roleNameroleName: "管理员"
//              */
//             select: [
//                 {
//                     "type": "jsonArray",
//                     "alias": "user",
//                     "fields": {
//                         "id": "user.id",
//                         "username": "user.username"
//                     }
//                 },
//                 {
//                     "type": "count",
//                     "alias": "userCount",
//                     "fields": {
//                         "id": "user.id"
//                     }
//                 },
//                 {
//                     "type": "raw",
//                     "alias": "userRaw",
//                     "fields": {
//                         "id": "user.id",
//                         "username": "user.username"
//                     }
//                 }
//             ]
//         }
//     ]
// })

// console.log(JSON.stringify(joinsResult, null, 2));
// 分页 
// const pageIndex = 1;
// const pageSize = 10;
// const paginationResult = await userRole.aggregate({
//     // 需要显示的字段
//     fields: ["user.id"],
//     // 查询条件
//     query: {
//         "user_role.id": { $eq: 10004 }
//     },
//     // 分组
//     group: ["user.id"] as any,
//     // 排序方式
//     sort: { "user.id": "asc" },
//     joins: [
//         {
//             // 连接的表
//             table: "system_user",
//             // 连接类型 inner self left right   
//             type: "inner",
//             // 连接后的别名  不传 t1 t2 t3 依次累加
//             as: "user",
//             // 连接条件
//             on: { "user_role.userId": "user.id" },
//             // 连接后的字段  jsonArray count raw

//             /**
//              * type含义拼接生成的 SQL 示例最终输出结果格式
//              * jsonArray一对多/多对多聚合数组IF(COUNT(r.id)=0, JSON_ARRAY(), JSON_ARRAYAGG(...))roles: [{ id: 1, name: 'admin' }]
//              * count统计关联行数COUNT(r.id) AS roleCountroleCount: 3
//              * raw传统连表打平查字段r.name AS roleNameroleName: "管理员"
//              * jsonObject 一对一/聚合对象 IF(ISNULL(r.id), NULL,JSON_OBJECT(....)) role: { id: 1, name: 'admin' }
//              */
//             select: [
//                 {
//                     "type": "jsonArray",
//                     "alias": "user",
//                     "fields": {
//                         "id": "user.id",
//                         "username": "user.username"
//                     }
//                 },
//                 {
//                     "type": "count",
//                     "alias": "userCount",
//                     "fields": {
//                         "id": "user.id"
//                     }
//                 },
//                 {
//                     "type": "raw",
//                     "alias": "userRaw",
//                     "fields": {
//                         "id": "user.id",
//                         "username": "user.username"
//                     }
//                 },
//                 {
//                     "type": "jsonObject",
//                     "alias": "userJsonObject",
//                     "fields": {
//                         "id": "user.id",
//                         "username": "user.username"
//                     }
//                 }
//             ]
//         }
//     ],
//     // 数量
//     limit: pageSize,
//     // 偏移量
//     offset: (pageIndex - 1) * pageSize
// })

// console.log(JSON.stringify(paginationResult, null, 2));

