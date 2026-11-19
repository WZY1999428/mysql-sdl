import { userModel, testSnowflakeModel } from "./database.ts";

// 测试不同的插入操作
const tasks = [
    // // 1. 基础插入操作 - 直接插入一条用户记录
    // userModel.insertMany([{ username: "new_username", nickname: "new_nickname", password: "password", email: "email", phone: "phone", isSuperAdmin: 0, enabled: 1 }]),

    // // 2. 忽略重复 - 如果记录已存在则跳过，不报错（使用 INSERT IGNORE）
    // userModel.insertMany([{ username: "new_username", nickname: "new_nickname", password: "password", email: "email", phone: "phone", isSuperAdmin: 0, enabled: 1 }], {
    //     ignore: true
    // }),

    // // 3. 更新重复 - 如果记录已存在则更新，否则插入（使用 ON DUPLICATE KEY UPDATE）
    // userModel.insertMany([{ username: "new_username", nickname: "new_nickname", password: "password", email: "email", phone: "phone", isSuperAdmin: 0, enabled: 1 }], {
    //     upsert: true
    // }),

    // // 4. 指定字段更新 - 仅在重复时更新指定的字段（nickname 和 password）
    // userModel.insertMany([{ username: "new_username", nickname: "new_nickname", password: "password", email: "email", phone: "phone", isSuperAdmin: 0, enabled: 1 }], {
    //     upsert: ["nickname", "password"]
    // }),

    // // 6. 批量大小控制 - 设置批次大小为 300，分批插入大量数据
    // userModel.insertMany([{ username: "new_username", nickname: "new_nickname", password: "password", email: "email", phone: "phone", isSuperAdmin: 0, enabled: 1 }], {
    //     batchSize: 300
    // }),
     
    // 测试雪花id 批量插入
    testSnowflakeModel.insertMany([{ name: "test", age: 18 }, { name: "test2", age: 19 }, { name: "test3", age: 20 }]),
]

// 并行执行所有插入任务
await Promise.all(tasks)
