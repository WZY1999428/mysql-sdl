import { userModel } from "./database.ts";

// 更新一个
const tasks = [
    // // 更新用户id为100的用户
    // userModel.updateOne({ id: 100 }, { username: "new_username" }),
    // // 更新用户id为101的用户
    // userModel.updateOne({ id: { $eq: 101 } }, { password: "password" }),
    // // 使用$in 也只会更新第一个
    // userModel.updateOne({ id: { $in: [101, 200, 3000] } }, { password: "password" })
    await userModel.updateOne({ id: 100 }, { $inc: { age: 1 } }),  // 增加年龄
    await userModel.updateOne({ id: 100 }, { $dec: { age: 1 } }),  // 减少年龄
    await userModel.updateOne({ id: 100 }, { $mul: { age: 1 } }),  // 乘以年龄
    await userModel.updateOne({ id: 100 }, { $div: { age: 1 } }),  // 除以年龄
    await userModel.updateOne({ id: 100 }, { $max: { score: 100 } }),  // 最大分数
    await userModel.updateOne({ id: 100 }, { $min: { score: 100 } }),  // 最小分数
    await userModel.updateOne({ id: 100 }, { $concat: { username: "test" } }), // 拼接用户名

]

await Promise.all(tasks)
