import { userModel } from "./database.ts";

// 更新一个
const tasks = [
    // 更新用户id为100的用户
    userModel.updateMany({ id: 100 }, { username: "new_username" }),
    // 更新用户id小于101的用户s
    userModel.updateMany({ id: { $lt: 101 } }, { password: "password" }),
    // 使用$in 更新多个用户
    userModel.updateMany({ id: { $in: [101, 200, 3000] } }, { password: "password" }),
    // 使用$like 更新多个用户
    userModel.updateMany({ id: { $like: "%赵%" } }, { password: "password" }),
    //限制更新数量
    userModel.updateMany(
        { enabled: 0 },
        { enabled: 1 },
        { limit: 100 }
    ),
    //排序后更新
    userModel.updateMany(
        { enabled: 0 },
        { enabled: 1 },
        {
            sort: { id: "asc" },
            limit: 100
        }
    ),
    // 分页更新
    userModel.updateMany(
        { enabled: 0 },
        { enabled: 1 },
        {
            sort: { id: "asc" },
            limit: 100,
            offset: 100
        }
    )
]

await Promise.all(tasks)
