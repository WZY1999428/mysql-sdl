import { userModel } from "./database.ts";

const page = {
    limit: 10,
    offset: 0
}

const taks = [
    // 查询用户id为100  返回字段id username createdAt
    userModel.findMany({ id: { $eq: 10000 } }, { ...page, fields: ["id", "username", "createdAt"] }),
    // 查询id小于20000的用户 按创建时间倒序
    userModel.findMany({ id: { $lt: 20000 } }, { ...page, sort: { createdAt: "desc" } }),
    //  查询 日期范围
    userModel.findMany({ createdAt: { $between: ["2025-01-01 00:00:00", "2025-12-31 23:59:59"] } }, { ...page }),
    userModel.findMany({ updatedAt: { $exists: true } }, { ...page }),
    // 查询姓名包含"张"的用户
    userModel.findMany({ name: { $like: "%张%" } }, { ...page }),
    // 查询日期范围
    userModel.findMany({ createdAt: { $gte: "2025-01-01 00:00:00" } }, { ...page }),
    userModel.findMany({
        $or: [
            { name: { $like: "%张%" } },
            { name: { $like: "%张三%" } }
        ]
    })
]

const results = await Promise.all(taks)
console.log(results);