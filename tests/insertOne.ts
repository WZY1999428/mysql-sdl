import { userModel, testSnowflakeModel } from "./database.ts";

// 测试不同的插入操作
const tasks = [
    // 测试雪花id 插入
    testSnowflakeModel.insertOne({ name: "test", age: 18 }),
    // 1. 普通插入：插入一条新数据
    // 如果主键或唯一索引冲突，会抛出错误
    userModel.insertOne({ username: "new_username", nickname: "new_nickname", password: "password", email: "email", phone: "phone", isSuperAdmin: 0, enabled: 1 }),

    // 2. 忽略重复插入：如果数据已存在（主键或唯一索引冲突），则忽略本次插入，不会报错
    // 相当于 INSERT IGNORE
    userModel.insertOne({ username: "new_username", nickname: "new_nickname", password: "password", email: "email", phone: "phone", isSuperAdmin: 0, enabled: 1 }, {
        ignore: true
    }),

    // 3. 更新插入（Upsert）：如果数据已存在，则更新所有传入的字段
    // 如果数据不存在，则插入新数据
    // upsert: true 表示更新所有传入的字段
    userModel.insertOne({ username: "new_username", nickname: "new_nickname", password: "password", email: "email", phone: "phone", isSuperAdmin: 0, enabled: 1 }, {
        upsert: true
    }),

    // 4. 更新插入（Upsert）：如果数据已存在，则仅更新指定的字段
    // 仅更新 nickname 和 password 字段，其他字段保持不变
    userModel.insertOne({ username: "new_username", nickname: "new_nickname", password: "password", email: "email", phone: "phone", isSuperAdmin: 0, enabled: 1 }, {
        upsert: ["nickname", "password"]
    })



]

// 并行执行所有插入任务
await Promise.all(tasks)
