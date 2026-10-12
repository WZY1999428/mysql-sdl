# MySQL DSL

> 🚀 **Like MongoDB, but for MySQL.**  
> 基于 `mysql2` 打造，像写 MongoDB / Mongoose 查询一样操作 MySQL。支持声明式 JSON 连表、自动聚合以及强类型 TypeScript 体验。

---

## 📖 项目简介

> ⚠️ **注意**：功能还在开发中，功能可能不完善，使用时请谨慎。

**MySQL DSL** 是一个专为 TypeScript / Node.js 开发者打造的声明式 SQL 查询构建工具，**原生基于 `mysql2` 驱动开发**。

它的设计初衷是将 **MongoDB 简单直观的 JSON 查询 API** 引入到 **MySQL 关系型数据库** 中。你不再需要手动拼接复杂的 `LEFT JOIN`、`GROUP BY` 或 `JSON_ARRAYAGG`，只需传入结构化的 JSON 对象，即可自动生成防注入的 SQL 并通过 `mysql2` 执行。

### ✨ 核心特性

- 🍃 **Mongo 风格 API**：原生支持 `$ne`、`$gt`、`$in`、`$like` 等操作符，上手零门槛。
- ⚡ **原生基于 `mysql2`**：完美兼容 `mysql2` 的 Promise 连接池（Pool）和连接对象，零额外包体积负担。
- 🔗 **声明式连表（Declarative Join）**：通过简洁的 JSON 配置直接搞定一对多、多对多的 `JOIN` 查询。
- 📦 **自动 JSON 聚合**：连表查询自动将子表记录聚合为 JSON 数组（`jsonArray`）或对象，无需手动清洗转换数据。
- 🛡️ **安全与类型保障**：基于 TypeScript，提供精准的字段类型补全，并通过 `mysql2` 参数化绑定彻底防护 SQL 注入。

---

## 💡 使用示例

### 📝 插入数据

```typescript
// 1. 普通插入
await userModel.insertOne({
  username: "new_username",
  nickname: "new_nickname",
  password: "password",
  email: "email",
  phone: "phone",
  isSuperAdmin: 0,
  enabled: 1
})

// 2. 忽略重复插入（INSERT IGNORE）
await userModel.insertOne({ username: "new_username", ... }, {
  ignore: true
})

// 3. 更新插入（Upsert）- 更新所有字段
await userModel.insertOne({ username: "new_username", ... }, {
  upsert: true
})

// 4. 更新插入（Upsert）- 仅更新指定字段
await userModel.insertOne({ username: "new_username", ... }, {
  upsert: ["nickname", "password"]
})
```

### 🔍 查询数据

```typescript
// 查询用户id为10000，返回指定字段
await userModel.findMany(
  { id: { $eq: 10000 } },
  { limit: 10, offset: 0, fields: ["id", "username", "createdAt"] }
)

// 查询id小于20000的用户，按创建时间倒序
await userModel.findMany(
  { id: { $lt: 20000 } },
  { limit: 10, offset: 0, sort: { createdAt: "desc" } }
)

// 查询日期范围
await userModel.findMany(
  { createdAt: { $between: ["2025-01-01 00:00:00", "2025-12-31 23:59:59"] } },
  { limit: 10, offset: 0 }
)

// 模糊查询
await userModel.findMany(
  { name: { $like: "%张%" } },
  { limit: 10, offset: 0 }
)
```

### ✏️ 更新数据

```typescript
// 更新用户id为100的用户
await userModel.updateOne({ id: 100 }, { username: "new_username" })

// 使用操作符
await userModel.updateOne({ id: { $eq: 101 } }, { password: "password" })

// 使用 $in 更新匹配的第一个
await userModel.updateOne(
  { id: { $in: [101, 200, 3000] } },
  { password: "password" }
)
```

### 🔗 连表查询与聚合

```typescript
// 连表查询示例
await userRole.aggregate({
  fields: ["user.id"],
  query: { "user_role.id": { $eq: 10004 } },
  group: ["user.id"],
  sort: { "user.id": "asc" },
  joins: [
    {
      table: "system_user",
      type: "inner",
      as: "user",
      on: { "user_role.userId": "user.id" },
      select: [
        {
          type: "jsonArray",
          as: "user",
          fields: { id: "user.id", username: "user.username" }
        },
        {
          type: "count",
          as: "userCount",
          fields: { id: "user.id" }
        },
        {
          type: "jsonObject",
          as: "userJsonObject",
          fields: { id: "user.id", username: "user.username" }
        }
      ]
    }
  ],
  limit: 10,
  offset: 0
})
```

### 📦 JSON 字段查询

```typescript
// 查询 JSON 字段
await userModel.findOne({
  $json: {
    "object.a.v": { $eq: 30 },
    "object.b.v": { $eq: 30 }
  },
  $or: [
    { $json: { "object.a.v": { $eq: 30 } } },
    { $json: { "object.a.v": { $eq: 30 } } }
  ]
})
```

---