import { Schema, DataType } from "../src/schema/index.ts";
import MySqlODM from "../src/index.ts"
const odm = new MySqlODM({
    debug: true
});

type User = {
    id?: number,
    avatar?: string,
    username: string,
    nickname: string,
    password: string,
    email: string,
    phone: string,
    enabled: number,
    isSuperAdmin: number,
    createdAt?: string,
    updatedAt?: string,
}

type UserRole = {
    id?: number,
    userId: number,
    roleId: number,
    createdAt: string,
    updatedAt: string,
}

await odm.use({
    host: "localhost",
    user: "root",
    password: "123456789",
    database: "koa-serve"
}, "connection")


export const userModel = await odm.model<User>("system_user", new Schema<User>({
    id: { type: DataType.BigInt, primaryKey: true, autoIncrement: { start: 10000, enabled: true } },
    avatar: { type: DataType.VarChar, length: 255, nullable: true },
    username: { type: DataType.VarChar, length: 255, nullable: false, unique: true },
    nickname: { type: DataType.VarChar, length: 255, nullable: false },
    password: { type: DataType.VarChar, length: 255, nullable: false },
    email: { type: DataType.VarChar, length: 255, nullable: false, unique: true },
    phone: { type: DataType.VarChar, length: 50, nullable: false, unique: true },
    enabled: { type: DataType.Int, default: 1 },
    isSuperAdmin: { type: DataType.Int, default: 0 },
    createdAt: { type: DataType.DateTime, default: 'CURRENT_TIMESTAMP' },
    updatedAt: { type: DataType.DateTime, default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
}));


export const userRole = await odm.model<UserRole>("user_role", new Schema<UserRole>({
    id: { type: DataType.BigInt, primaryKey: true, autoIncrement: { start: 10000, enabled: true } },
    userId: { type: DataType.BigInt, nullable: false, uniqueGroup: ["user_role_unique"] },
    roleId: { type: DataType.BigInt, nullable: false, uniqueGroup: ["user_role_unique"] },
    createdAt: { type: DataType.DateTime, default: 'CURRENT_TIMESTAMP' },
    updatedAt: { type: DataType.DateTime, default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
}));



const songSchema = new Schema({
    id: { type: DataType.BigInt, primaryKey: true, autoIncrement: { start: 10000, enabled: true } },
    title: { type: DataType.VarChar, length: 255, nullable: false }, // 歌名（如：晴天）
    mvUrl: { type: DataType.VarChar, length: 255, nullable: true }, // 歌名（如：晴天）
    cover: { type: DataType.Int, nullable: true }, // 封面图 文件id
    createUserId: { type: DataType.BigInt, nullable: true }, // 创建人
    enabled: { type: DataType.TinyInt, nullable: false, default: 1 }, // 是否启用
    publishDate: { type: DataType.DateTime, nullable: false }, // 发布日期
});

const songArtistSchema = new Schema({
    id: { type: DataType.BigInt, primaryKey: true, autoIncrement: { start: 10000, enabled: true } },
    songId: { type: DataType.Int, nullable: false },   // 歌曲id
    artistId: { type: DataType.Int, nullable: false },    // 演唱者 id
});



const artistSchema = new Schema({
    // 1. 基础信息
    id: { type: DataType.BigInt, primaryKey: true, autoIncrement: { start: 10000, enabled: true } },
    name: { type: DataType.VarChar, length: 100, nullable: false, unique: true },        // 歌手/乐队名称 (如: 周杰伦 / Mayday)
    realName: { type: DataType.VarChar, length: 100, nullable: true },   // 真实姓名 (如: 周杰伦 / 蔡依林)
    avatar: { type: DataType.BigInt, nullable: false },      // 歌手头像/封面图片地址
    cover: { type: DataType.BigInt, nullable: true },       // 歌手主页大背景图 (可选)
    createUserId: { type: DataType.BigInt, nullable: true },       // 歌手主页大背景图 (可选)
    // 2. 检索与分类
    pinyin: { type: DataType.VarChar, length: 100, nullable: true, index: true },      // 拼音简写 (用于首字母检索，如: zjl)
    firstLetter: { type: DataType.VarChar, length: 1, nullable: true },  // 姓氏首字母 (用于 A-Z 歌手筛选，如: Z)
    gender: { type: DataType.Char, length: 100 },                           // 性别/类型 (0: 未知, 1: 男, 2: 女, 3: 组合/乐队)
    area: { type: DataType.VarChar, length: 50, nullable: true },         // 地区 (如: 华语, 欧美, 日本, 韩国)
    // 3. 详情与介绍
    description: { type: DataType.Text, nullable: true },                 // 歌手简介 / 履历
    // 4. 统计与展示控制 (用于前台排序/推荐)
    sort: { type: DataType.Int, default: 0 },                       // 权重/自定义排序 (值越大越靠前)
    isHot: { type: DataType.Int, default: 0 },                           // 是否热门歌手 (0: 否, 1: 是，用于首页推荐)
    // 5. 状态管理
    enabled: { type: DataType.Int, default: 1 },                          // 状态 (0: 隐藏/下架, 1: 正常展示)
});

export const songModel = await odm.model('music_song', songSchema);
export const songArtistModel = await odm.model('music_song_artist', songArtistSchema);
export const artistModel = await odm.model('music_artist', artistSchema);