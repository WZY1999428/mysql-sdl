import { userModel } from "./database.ts";

const taks = [
    // 精确匹配 - 删除 id 等于 10000 的用户
    userModel.deleteOne({ id: { $eq: 10000 } }),

    // 小于比较 - 删除 id 小于 20000 的用户
    userModel.deleteOne({ id: { $lt: 20000 } }),

    // 范围查询 - 删除创建时间在 2025 年全年的用户
    userModel.deleteOne({ createdAt: { $between: ["2025-01-01 00:00:00", "2025-12-31 23:59:59"] } }),

    // 存在性检查 - 删除更新时间存在的用户（非 NULL）
    userModel.deleteOne({ updatedAt: { $ne: null } }),

    // 模糊匹配 - 删除姓名包含"张"的用户
    userModel.deleteOne({ name: { $like: "%张%" } }),

    // 嵌套查询 - 使用 query 对象包裹查询条件，删除创建时间大于等于 2025-01-01 的用户
    userModel.deleteOne({ query: { createdAt: { $gte: "2025-01-01 00:00:00" } } })
]

const results = await Promise.all(taks)
console.log(results);