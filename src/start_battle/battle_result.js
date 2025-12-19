const { getBattleFromBattleId, isCheckpointCrossed } = require("../models/index")
const {
    getUserBattleByBattleId,
    updateUserBattleByBattleId,
    updateUserCoins,
    updateUserLeague,
    getUserByUserId
} = require("../models/index")
const {addUserCoinsHistory} = require("../models/coins")
const blockedBattleModel = require("../db/modules/blocked_user_battle")

const battle_result = async (battle) => {
    let player1_activity_item = {
            module:"battle",
            user_battle_id: battle.data._id,
            battle_id: battle.data.battle_id,
            battle_name: battle.data.battle_name,
            battle_image: battle.data.battle_image,
            user_id: battle.data.player1.id,
            entry_fee: battle.data.entry_fee,
            entry_fee_type: battle.data.entry_fee_type,
            reward_type: battle.data.rewardType,
            timestamp: +new Date()
        }
    let player2_activity_item = {
        module:"battle",
        user_battle_id: battle.data._id,
        battle_id: battle.data.battle_id,
        battle_name: battle.data.battle_name,
        battle_image: battle.data.battle_image,
        user_id: battle.data.player2.id,
        entry_fee: battle.data.entry_fee,
        entry_fee_type: battle.data.entry_fee_type,
        reward_type: battle.data.rewardType,
        timestamp: +new Date()
        }
    return new Promise((async (resolve, reject) => {
        const battle_details = await getBattleFromBattleId(battle.data.battle_id).catch(err=>{
            reject(err)
        })
        const reward = battle_details.data[0].reward
        const reward_type = battle_details.data[0].rewardType
        const entry_fee = battle_details.data[0].entryFee
        const user_battle = await getUserBattleByBattleId(battle.data._id).catch(err=>{
            reject(err)
        })
        const player1_details = await getUserByUserId(user_battle[0].player1.id).catch(err=>{
            reject(err)
        })
        const player2_details = await getUserByUserId(user_battle[0].player2.id).catch(err=>{
            reject(err)
        })
        if (user_battle[0].player1.votes > user_battle[0].player2.votes) {
            await updateUserBattleByBattleId(battle.data._id, "player1", reward).catch(err=>{
                reject(err)
            })
            const data = await updateUserCoins(user_battle[0].player1.id, reward).catch(err=>{
                reject(err)
            })
            await updateUserLeague(user_battle[0].player1.id, data.Attributes.coins).catch(err=>{
                reject(err)
            })
            await updateUserLeague(user_battle[0].player2.id, player2_details[0].coins).catch(err=>{
                reject(err)
            })
            await isCheckpointCrossed(player1_details[0].coins, data.Attributes.coins, battle.data.player1.id)
            player1_activity_item["reward"] = reward
            player2_activity_item["reward"] = 0
            player1_activity_item["coins"] = `+${reward}`
            player2_activity_item["coins"] = `+0`
            player1_activity_item["description"] = `You earn ${reward} ${reward_type} by winning this battle`
            player2_activity_item["description"] =  `You lost this battle! Play again to earn ${reward_type}`
        }
        else if (user_battle[0].player1.votes < user_battle[0].player2.votes) {
            await updateUserBattleByBattleId(battle.data._id, "player2", reward).catch(err=>{
                reject(err)
            })
            const data = await updateUserCoins(user_battle[0].player2.id, reward).catch(err=>{
                reject(err)
            })
            await updateUserLeague(user_battle[0].player2.id, data.Attributes.coins).catch(err=>{
                reject(err)
            })
            await updateUserLeague(user_battle[0].player1.id, player1_details[0].coins).catch(err=>{
                reject(err)
            })
            await isCheckpointCrossed(player2_details[0].coins, data.Attributes.coins, battle.data.player2.id)
            player1_activity_item["reward"] = 0
            player2_activity_item["reward"] = reward
            player1_activity_item["coins"] = `+0`
            player2_activity_item["coins"] = `+${reward}`
            player1_activity_item["description"] = `You lost this battle! Play again to earn ${reward_type}`
            player2_activity_item["description"] =  `You earn ${reward} ${reward_type} by winning this battle`
        }
        else {
            await updateUserBattleByBattleId(battle.data._id, "tied", 0).catch(err=>{
                reject(err)
            })
            player1_activity_item["reward"] = 0
            player2_activity_item["reward"] = 0
            player1_activity_item["coins"] = `+0`
            player2_activity_item["coins"] = `+0`
            player1_activity_item["description"] = `Battle Tied`
            player2_activity_item["description"] =  `Battle Tied`
        }
        await addUserCoinsHistory(player1_activity_item).catch(err=>{
            reject(err)
        })
        await addUserCoinsHistory(player2_activity_item).catch(err=>{
            reject(err)
        })
        resolve("Battle result declared successfully")
    }))
}

const declare_result = async (result) => {
    let battle = {}
    const is_battke_blocked = await blockedBattleModel.findOne({_id: result._id}).exec()
    if (is_battke_blocked) {
        console.log(`Battle ${result._id} is Blocked`)
        return;
    }
    battle['data'] = result;
    const battle_result_data = await battle_result(battle);
    console.log(`Updated result for battle id ${result._id}`)
    return battle_result_data;
  }

module.exports = { battle_result, declare_result}
