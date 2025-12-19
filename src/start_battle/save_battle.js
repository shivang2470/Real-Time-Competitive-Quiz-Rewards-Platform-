const { getBattleFromBattleId, getCategoriesDetailsById, getSubCategoryDetailById, updateUserStatsCount, updateOverAllCount, getCurrentWeekNumber } = require("../models/index")
const { userDetail } = require("../models/user_detail")
const { save_battle_data } = require("../models/start_battle")
const { updateUserCoins, updateUserFeeDeducted, updateTotalParticipation } = require("../models/index")
const { insertActivity } = require("../models/activities")


const save_battle = async (items) => {
    let battle_data = {}
    return new Promise((async (resolve, reject) => {
        const battle_details = await getBattleFromBattleId(items[0].battle_id).catch(async error => {
            reject(error);
        })
        if(battle_details){
            battle_data['category_id'] = battle_details.data[0].category_id
            battle_data['category_name'] = battle_details.data[0].category_name
            battle_data['sub_category_id'] = battle_details.data[0].parent_id
            battle_data['sub_category_name'] = battle_details.data[0].subCategoryName
            battle_data['battle_name'] = battle_details.data[0].name
            battle_data['battle_id'] = battle_details.data[0].id
            battle_data['battle_image'] = battle_details.data[0].path
            const category_details = await getCategoriesDetailsById(battle_details.data[0].category_id).catch(async error => {
                reject(error);
            })
            if(category_details){
                const subcategory_details = await getSubCategoryDetailById(battle_details.data[0].parent_id).catch(async error => {
                    reject(error);
                })
                if(subcategory_details){
                    battle_data['category_image_url'] = category_details.data[0].path
                    battle_data['sub_category_image_url'] = subcategory_details.data[0].path
                    const player1_detail = await userDetail(items[0].user_id).catch(async error => {
                        reject(error);
                    })
                    if(player1_detail){
                        const player2_detail = await userDetail(items[1].user_id).catch(async error => {
                            reject(error);
                        })
                        if(player2_detail){
                            battle_data['player1'] = {
                                'name': player1_detail.Item.name,
                                'username': player1_detail.Item.username,
                                'id': items[0].user_id,
                                'avatar': player1_detail.Item.avatar,
                                'battle_file': items[0].battle_file,
                            }
                            battle_data['player2'] = {
                                'name': player2_detail.Item.name,
                                'username': player2_detail.Item.username,
                                'id': items[1].user_id,
                                'avatar': player2_detail.Item.avatar,
                                'battle_file': items[1].battle_file,
                            }
                            battle_data['start_timestamp'] = + new Date()
                            battle_data['duration'] = parseInt(battle_details.data[0].battleTime)
                            battle_data['winner_reward_type'] = battle_details.data[0].rewardType
                            const dt = new Date(battle_data['start_timestamp'])
                            dt.setSeconds(dt.getSeconds() + parseInt(battle_data['duration']) * 60)
                            battle_data['end_timestamp'] = dt.getTime()
                            battle_data['entry_fee_type'] = battle_details.data[0].entryFeeType
                            battle_data['entry_fee'] = parseInt(battle_details.data[0].entryFee)
                            const result = await save_battle_data(battle_data).catch(async error => {
                                reject(error);
                            })
                            if(result){
                                const updateData1 = await updateTotalParticipation(items[0].user_id).catch(async error => {
                                    reject(error);
                                })
                                if(updateData1){
                                    const updateData2 = await updateTotalParticipation(items[1].user_id).catch(async error => {
                                        reject(error);
                                    })
                                    await updateUserStatsCount(items[0].user_id, "total_battles_count");
                                    await updateUserStatsCount(items[0].user_id, `battles_count.${battle_details.data[0].id}`);
                                    await updateUserStatsCount(items[1].user_id, "total_battles_count");
                                    await updateUserStatsCount(items[1].user_id, `battles_count.${battle_details.data[0].id}`);
                                    await updateOverAllCount(`battle_count`)
                                    await updateOverAllCount(`battles.${new Date().getFullYear()}.count`)
                                    await updateOverAllCount(`battles.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
                                    await updateOverAllCount(`battles.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
                                    await updateOverAllCount(`battles.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
                                    await updateOverAllCount(`battles.${battle_details.data[0].id}.count`)
                                    await updateOverAllCount(`battles.${battle_details.data[0].id}.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
                                    await updateOverAllCount(`battles.${battle_details.data[0].id}.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
                                    await updateOverAllCount(`battles.${battle_details.data[0].id}.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
                                    if(updateData2){
                                        resolve(result)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }))
}

const deduct_fee = async (battle_id, fee, player1_id, player2_id, entry_fee_deducted) => {
    return new Promise((async (resolve, reject) => {
        const update1 = await updateUserCoins(player1_id, "-" + fee.toString()).catch(async error => {
            reject(error);
        })
        const update2 = await updateUserCoins(player2_id, "-" + fee.toString()).catch(async error => {
            reject(error);
        })
        if (update1 && update2 && !(entry_fee_deducted)) {
            const deducted = await updateUserFeeDeducted(battle_id).catch(async error => {
                reject(error);
            })
            if (deducted) {
                resolve("updated")
            }
        }
    }))
}

module.exports = { save_battle, deduct_fee }
