import { userModel, songModel, songArtistModel, artistModel } from "./database.ts";

const taks = [
    // 查询用户id为10000 等于xxx 时可以简写
    // userModel.findOne({ id: 10000 }),
    // // 查询用户id为100 
    // userModel.findOne({ id: { $eq: 10000 } }),
    // // 查询id小于20000的用户
    // userModel.findOne({ id: { $lt: 20000 } }),
    // //  查询 日期范围
    // userModel.findOne({ createdAt: { $between: ["2025-01-01 00:00:00", "2025-12-31 23:59:59"] } }),
    // // 查询姓名包含"张"的用户
    // userModel.findOne({ name: { $like: "%张%" } }),
    // // 查询日期范围
    // userModel.findOne({ createdAt: { $gte: "2025-01-01 00:00:00" } }),

    // // 查询json
    // userModel.findOne({ $json: { "objext.a.v": { $eq: 30 } } }),
    // userModel.findOne({
    //     id: {
    //         $select: {
    //             table: "system_user",
    //             fields: ["id"],
    //             joins: [
    //                 {
    //                     table: "user",
    //                     as: "user",
    //                     type: "inner",
    //                     on: {
    //                         id: "system_user.id"
    //                     }
    //                 }
    //             ],
    //             query: {
    //                 id: 10000
    //             }
    //         }
    //     }
    // })
    // songModel.aggregate({
    //     fields: songModel.qualifyFields(["id", "title", "cover"]),
    //     query: {
    //         id: {
    //             $in: [
    //                 {
    //                     table: "music_song_artist",
    //                     fields: ["songId"],
    //                     joins: [
    //                         {
    //                             table: "music_song_artist",
    //                             as: "artist",
    //                             type: "inner",
    //                             on: {
    //                                 id: "artist.artist_id"
    //                             }
    //                         }

    //                     ],
    //                     query: {
    //                         title: {$like:"%周杰伦%"}
    //                     }
    //                 }
    //             ]
    //         }
    //     },
    //     joins:[
    //         {
    //             table: "music_artist",
    //             as: "artist",
    //             type: "inner",
    //             on: {
    //                 id: "artist.id"
    //             }
    //         }
    //     ]
    // }) 

    // 条件判断 CASE WHEN name = '周杰伦' THEN 1 ELSE 0 END
    // 字段子查询 

    // songModel.findOne({
    //     user: {
    //         $case: {
    //             branches: [
    //                 {
    //                     when: {
    //                         id: 1
    //                     },
    //                     then: "1"
    //                 },
    //                 {
    //                     when: {
    //                         id: { $in: [1, 3, 4, 5, 6] }
    //                     },
    //                     then: "2"
    //                 },
    //                 {
    //                     when: {
    //                         id: { $nin: [7, 8, 9, 10, 11, 12] }
    //                     },
    //                     then: "3"
    //                 },
    //                 {
    //                     when: {
    //                         title: { $like: "%周杰伦%" }
    //                     },
    //                     then: "4"
    //                 },
    //                 {
    //                     when: {
    //                         title: {
    //                             $select: {
    //                                 table: "music_artist",
    //                                 fields: ["id"],
    //                                 query: {
    //                                     name: "周杰伦"
    //                                 }
    //                             }
    //                         }
    //                     },
    //                     then: "4"
    //                 }
    //             ],
    //             else: "0"
    //         }
    //     }
    // }, {
    //     fields: [{
    //         username: {
    //             $case: {
    //                 branches: [
    //                     {
    //                         when: {
    //                             id: {
    //                                 $case: {
    //                                     branches: [
    //                                         {
    //                                             when: {
    //                                                 name: { $eq: "周杰伦" }
    //                                             },
    //                                             then: "1"
    //                                         }
    //                                     ],
    //                                     else: "0"
    //                                 }
    //                             }
    //                         },
    //                         then: "1"
    //                     }
    //                 ],
    //                 else: "0"
    //             }
    //         },
    //         nickname: {
    //             $select: {
    //                 table: "system_user",
    //                 fields: ["nickname"],
    //                 query: {
    //                     id: { $col: "system_user.id" }
    //                 },
    //             }
    //         }
    //     }]
    // })

    // 排序

    songModel.findOne({}, {
        sort: {
            id: "desc",
            $expr: [{
                query: {
                    title: {
                        $like: "111"
                    }
                },
                order: "desc"
            }, {
                query: {
                    name: {
                        $like: "111"
                    }
                },
                order: "desc"
            }]
        }
    })

    // songModel.findOne({
    //     enabled: 1,
    //     $and: [
    //         {
    //             title: {
    //                 $like: "周杰伦"
    //             },
    //             $or: [
    //                 {
    //                     $exists: {
    //                         table: "music_song_artist",
    //                         fields: ["1"],
    //                         query: {
    //                             songId: { $col: "music_song.id" },
    //                             "artist.name": { $like: "周杰伦" }
    //                         },
    //                         joins: [{
    //                             table: "music_artist",
    //                             as: "artist",
    //                             on: {
    //                                 "artist.id": "music_song_artist.artistId"
    //                             }
    //                         }]
    //                     }
    //                 }
    //             ]
    //         }
    //     ]
    // }, {
    //     fields: ["id", "title", "cover", "playTotal", {
    //         matchRank: {
    //             $case: {
    //                 branches: [
    //                     {
    //                         when: {
    //                             title: 1
    //                         },
    //                         then: "1"
    //                     },
    //                     {
    //                         when: {
    //                             $exists: {
    //                                 fields: ["1"],
    //                                 query: {
    //                                     songId: { $col: "music_song.id" },
    //                                     "artist.name": { $like: "周杰伦" }
    //                                 },
    //                                 table: "music_song_artist",
    //                                 joins: [{
    //                                     table: "music_artist",
    //                                     as: "artist",
    //                                     on: {
    //                                         "artist.id": "music_song_artist.artistId"
    //                                     }
    //                                 }]
    //                             }
    //                         },
    //                         then: "2"
    //                     },
    //                     {
    //                         when: {
    //                             title: { $like: "%周杰伦%" }
    //                         },
    //                         then: "3"
    //                     }
    //                 ],
    //                 else: "4"
    //             }
    //         }
    //     }]
    // })
]

const results = await Promise.all(taks)
console.log(results);