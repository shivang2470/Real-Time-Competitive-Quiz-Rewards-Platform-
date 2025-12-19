const battleModel = require('../db/modules/user_battles')
const votersModel = require('../db/modules/voters')
const reportBattleModel = require('../db/modules/report_battle')
const {getSettings, getBattleUpcoming, getUserStatsCount, getBattleFromBattleId, getOverAllStatsCount, getBattlesFromCategory, getBattlesFromSubCategory, getLiveEventsRandomData, getFeaturePermissions, checkCheckpoint, userCheckpoints} = require('../models/index')
const { userDetail } = require("../models/user_detail");
const { show_qureka_ads } = require("../../config/keys");
const ads = require("../s3/images/qureka_ad_banners");
const { BATTLE_ENDING_SECTION_TIMING } = require('../../config/constants');
const { get_message, get_old_messages } = require('./in_app_notifications');
const battlesSyncModel = require('../db/modules/battlesSync');
const { getWalletBalance } = require('./redemption');
const constants = require('../../config/constants');

function addHours(date, hours) {
    date.setHours(date.getHours() + hours);
    return date;
}

const create_data = async (item, result, settings, current_user_data, index) => {
    return new Promise((async (resolve, reject) => {
        const voteData = votersModel.findOne({ "voter_user_id": current_user_data.user_id, "user_battle_id": item._id }, { "user_battle_id": 1, "voted_player_id": 1 })
        voteData.exec(async function (getVoteErr, votedUserData) {
            if (getVoteErr) {
                reject(getVoteErr)
            }
            else{
                let can_vote = true
                let player1_voted = false
                let player2_voted = false
                if(votedUserData){
                    can_vote = votedUserData["user_battle_id"] ? false : true
                    if(item.player1['id'] === votedUserData['voted_player_id']){
                        player1_voted = true
                    } else if(item.player2['id'] === votedUserData['voted_player_id']){
                        player2_voted = true
                    }
                }
                const battle_share_message = settings.battle_share_message.split("(").join(`(www.talentitan.com/battle/${item._id}`)
                // result[index] = {
                //     id: item._id,
                //     player1: item.player1,
                //     player2: item.player2,
                //     category_id: item.category_id,
                //     category_name: item.category_name,
                //     battle_name: item.battle_name,
                //     battle_id: item.battle_id,
                //     battle_image: item.battle_image,
                //     start_timestamp: item.start_timestamp,
                //     duration: item.duration,
                //     end_timestamp: item.end_timestamp,
                //     time_left: (item.end_timestamp - (+new Date())) / 1000,
                //     can_vote,
                //     battle_share_message
                //     }
                result[index] = {
                    id: item._id,
                    player1: item.player1,
                    player2: item.player2,
                    start_timestamp: item.start_timestamp,
                    end_timestamp: item.end_timestamp,
                    battle_id: item.battle_id,
                    battle_name: item.battle_name,
                    battle_image: item.battle_image,
                    duration: item.duration,
                    can_vote,
                    time_left: (item.end_timestamp - (+new Date())) / 1000,
                    battle_share_message,
                    is_ad: show_qureka_ads === "true" && index % 5 === 0 && index !== 0?"true":"false",
                    image_url: show_qureka_ads === "true" && index % 5 === 0 && index !== 0?ads[Math.floor(Math.random()*ads.length)]:"",
                    player1_voted,
                    player2_voted
                }
                resolve(result)
            }
        })
    }))
}
const getHomeData = async (current_user_data, category_id, sub_category_id, limit, last_timestamp) => {
    let battleData = {}
    if(last_timestamp){
        battleData = battleModel.find({ $and: [{ $or: [ { category_id: category_id }, { sub_category_id: sub_category_id }]}, { end_timestamp: { $gte: new Date().getTime() } }, {'start_timestamp': {'$lt': last_timestamp}}] }, {"player1.id": 1, "player2.id": 1, "player1.username": 1, "player1.avatar": 1, "player1.name": 1, "player2.username": 1, "player1.battle_file": 1, "player2.battle_file": 1, "player2.avatar": 1, "player2.name": 1, "battle_name": 1, "battle_id": 1, "battle_image": 1, "end_timestamp": 1, "start_timestamp": 1, "duration": 1, "player1.votes": 1, "player2.votes": 1}).limit(limit).sort({ "start_timestamp": -1 });
    }
    else{
        battleData = battleModel.find({ $and: [{ $or: [{ category_id: category_id }, { sub_category_id: sub_category_id }] }, { end_timestamp: { $gte: new Date().getTime() }}] }, {"player1.id": 1, "player2.id": 1, "player1.username": 1, "player1.avatar": 1, "player1.name": 1, "player2.username": 1, "player1.battle_file": 1, "player2.battle_file": 1, "player2.avatar": 1, "player2.name": 1, "battle_name": 1, "battle_id": 1, "battle_image": 1, "end_timestamp": 1, "start_timestamp": 1, "duration": 1, "player1.votes": 1, "player2.votes": 1}).limit(limit).sort({ "start_timestamp": -1 });
    }
    return new Promise((async (resolve, reject) => {
        try{
            let settings = await getSettings().catch(async error => {
                reject(error);
            })
            battleData.exec(async function (err, data) {
                if (err) {
                    reject(err);
                }
                else {
                    const result = {}
                    if(data.length === 0){
                        resolve(result)
                    }
                    data.map(async (item, index) => {
                        await create_data(item, result, settings, current_user_data, index)
                        if(Object.keys(result).length == data.length){
                            resolve(Object.values(result))
                        }
                    })
                }
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const report_battle = async (item) => {
    const new_report = new reportBattleModel(item)
    return new Promise(((resolve, reject) => {
        new_report.save(async function (err, result) {
            if (err) {
                reject(err)
            }
            else {
                resolve("Added");
            }
        })
    }))
}

const updateBattleReportedCount = async (battle_id) => {
    const battleData = battleModel.updateOne({ "_id": battle_id }, { $inc: { reported_count: 1 } }, {upsert:true})
    return new Promise((async (resolve, reject) => {
        try{
            battleData.exec(async (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const getBattleDetail = async (battle_id, user_id) => {
    let battleData = battleModel.findOne({ _id: battle_id })
    let battleDetails = {}
    return new Promise((async (resolve, reject) => {
        battleData.exec(async function (err, data) {
            if (err) {
                reject(err);
            }
            else {
                let settings = await getSettings().catch(async error => {
                    await insertActivity(
                        req.userData.username,
                        req.userData.user_id,
                        "Home",
                        "Error occured in getSettings function",
                        req.url,
                        error)
                    reject(error);
                })
                const battle_share_message = settings.battle_share_message.split("(").join(`(www.talentitan.com/battle/${battle_id}`)
                battleDetails["battle_data"] = data
                let votersData = votersModel.findOne({ user_battle_id: battle_id, voter_user_id: user_id }, { voted_player_id: 1, timestamp: 1 })
                votersData.exec(async function (err, data) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        battleDetails["battle_share_message"] = battle_share_message
                        battleDetails["voted_to"] = data
                        resolve(battleDetails)
                    }
                })
            }
        })
    }))
}

const getVotersDetail = async (battle_id, user_id, last_timestamp, limit) => {
    let votersData = votersModel.find({ 
        user_battle_id: battle_id,
        voted_player_id: user_id }).limit(limit).sort({ "timestamp": -1 });
    if(last_timestamp){
        votersData = votersModel.find({ 
            user_battle_id: battle_id,
            voted_player_id: user_id,
            'timestamp': {'$lt': last_timestamp} }).limit(limit).sort({ "timestamp": -1 });
    }
    return new Promise((async (resolve, reject) => {
        votersData.exec(async function (err, data) {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        })
    }))
}

const is_not_bot = async (user_id) => {
    return new Promise((async (resolve, reject) => {
        const user_data = await userDetail(user_id);
        if(user_data && user_data.Item.user_type != "bot"){
            resolve(true)
        }
        else{
            resolve(false)
        }
    }))
}

const live_battles_without_bots = async () => {
    const battleData = battleModel.find({ end_timestamp: { $gte: new Date().getTime() }});
    return new Promise((async (resolve, reject) => {
        try{
            battleData.exec(async function (err, data) {
                if (err) {
                    reject(err);
                }
                else {
                    // const result = []
                    // let count = 0
                    // if(data.length === 0){
                    //     resolve(result)
                    // }
                    // data.map(async (item, index) => {
                    //     if(await is_not_bot(item.player1.id) || await is_not_bot(item.player2.id)){
                    //         count = count + 1
                    //         result.push(item)
                    //     }
                    //     if(data.length - 1 == index){
                    //         resolve(result);
                    //     }
                    // })
                        resolve(data)
                }
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const live_battles_without_bots_in_11 = async () => {
    const currentTime = new Date().getTime();
    const tenMinutesInMillis = 11 * 60 * 1000; // 11 minutes in milliseconds
    const newTime = currentTime - tenMinutesInMillis;
    const battleData = battleModel.find({ start_timestamp: { $gte: newTime }});
    return new Promise((async (resolve, reject) => {
        try{
            battleData.exec(async function (err, data) {
                if (err) {
                    reject(err);
                }
                else {
                        resolve(data)
                }
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const old_battles_without_bots_and_results = async () => {
    const battleData = battleModel.find({ end_timestamp: { $lt: new Date().getTime() }, winner: "", entry_fee_deducted: true});
    return new Promise((async (resolve, reject) => {
        try{
            battleData.exec(async function (err, data) {
                if (err) {
                    reject(err);
                }
                else {
                    const result = []
                    let count = 0
                    if(data.length === 0){
                        resolve(result)
                    }
                    data.map(async (item, index) => {
                        if(await is_not_bot(item.player1.id) || await is_not_bot(item.player2.id)){
                            count = count + 1
                            result.push(item)
                        }
                        if(data.length - 1 == index){
                            resolve(result);
                        }
                    })
                }
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const battlesEnding = async () => {
    const newDate = addHours(new Date(), BATTLE_ENDING_SECTION_TIMING);
    const battleData = battleModel.aggregate([
        {$match: {end_timestamp:{ $gte: new Date().getTime(), $lt: newDate.getTime() }}},
        {$sample: {size: 6}},
        { $project : {"_id": 1, "player1.id": 1, "player2.id": 1, "player1.username": 1, "player2.username": 1, "player1.battle_file": 1, "player2.battle_file": 1, "end_timestamp": 1, "start_timestamp": 1} }
      ]);
    return new Promise((async (resolve, reject) => {
        battleData.exec(async function (err, data) {
            if (err) {
                reject(err);
            }
            else {
                resolve(data)
            }
        })
    }))
}

const createBattlesEndingData = async (data) => {
    let task_to_complete = data.length
    let task_completed = 0
    return new Promise((async (resolve, reject) => {
        if(data.length == 0) {
            resolve([]);
        }
            data.map(async item=>{
            task_completed = task_completed + 1
            if(task_completed === task_to_complete){
                resolve(data);
            }
        })
    }))
}

const upcomingContest = async () => {
    const data = await getBattleUpcoming();
    const upcoming_battles = []
    while(1){
        if(upcoming_battles.length === 2)
            break;
        let random_battle = data[Math.floor(Math.random()*data.length)]
        if(upcoming_battles.includes(random_battle))
            continue;
        upcoming_battles.push(random_battle);
    }
    return(upcoming_battles);
}

const createHomeQuizData = async (user_id)=>{
    const home_quiz_data = []
    const quiz_ids = []
    const data = await getUserStatsCount(user_id)
    if(data === null || !data.total_quiz_count || data.total_quiz_count === 0){
        const overall_stats = await getOverAllStatsCount();
        const battle_data = overall_stats.quizzes;
        let sorted_quiz_data = [];
        for (let battle in battle_data) {
            if(battle.length === 4){
                continue;
            }
            sorted_quiz_data.push([battle, battle_data[battle].count]);
        }
        sorted_quiz_data.sort(function(a, b) {
            return b[1] - a[1];
        });
        for (let i=0; i<4; i++) {
            const battle_detail = await getBattleFromBattleId(sorted_quiz_data[i][0])
            home_quiz_data.push(battle_detail.data[0])
            if(home_quiz_data.length === 4){
                return(home_quiz_data);
            }
        }
    } else {
        const quiz_data = data.quiz_count;
        let sorted_quiz_data = [];
        for (let quiz in quiz_data) {
            sorted_quiz_data.push([quiz, quiz_data[quiz]]);
        }
        sorted_quiz_data.sort(function(a, b) {
            return b[1] - a[1];
        });
        if(sorted_quiz_data.length >=4){
            for (let i=0; i<sorted_quiz_data.length; i++) {
                const quiz_detail = await getBattleFromBattleId(sorted_quiz_data[i][0])
                home_quiz_data.push(quiz_detail.data[0])
                if(home_quiz_data.length === 4){
                    return(home_quiz_data);
                }
            }
        } else {
            for (let i=0; i<10; i++) {
                if(quiz_ids.includes(sorted_quiz_data[i][0])){
                    continue;
                }
                quiz_ids.push(sorted_quiz_data[i][0]);
                const quiz_detail = await getBattleFromBattleId(sorted_quiz_data[i][0])
                home_quiz_data.push(quiz_detail.data[0])
                if(home_quiz_data.length === 4){
                    return(home_quiz_data);
                } else if(sorted_quiz_data.length < 4){
                    const overall_stats = await getOverAllStatsCount();
                    const quiz_data = overall_stats.quizzes;
                    let sorted_quiz_data2 = [];
                    for (let quiz in quiz_data) {
                        if(quiz.length === 4){
                            continue;
                        }
                        sorted_quiz_data2.push([quiz, quiz_data[quiz].count]);
                    }
                    sorted_quiz_data2.sort(function(a, b) {
                        return b[1] - a[1];
                    });
                    sorted_quiz_data = sorted_quiz_data.concat(sorted_quiz_data2);
                }
            }
        }
    }
}

const createHomeBattleData = async (user_id)=>{
    const home_battle_data = []
    const battle_ids = []
    const data = await getUserStatsCount(user_id)
    if(data === null || !data.total_battles_count || data.total_battles_count === 0){
        const overall_stats = await getOverAllStatsCount();
        const battle_data = overall_stats.battles;
        let sorted_battle_data = [];
        for (let battle in battle_data) {
            if(battle.length === 4){
                continue;
            }
            sorted_battle_data.push([battle, battle_data[battle].count]);
        }
        sorted_battle_data.sort(function(a, b) {
            return b[1] - a[1];
        });
        for (let i=0; i<4; i++) {
            const battle_detail = await getBattleFromBattleId(sorted_battle_data[i][0])
            home_battle_data.push(battle_detail.data[0])
            if(home_battle_data.length === 4){
                return(home_battle_data);
            }
        }
    } else {
        const battle_data = data.battles_count;
        let sorted_battle_data = [];
        for (let battle in battle_data) {
            sorted_battle_data.push([battle, battle_data[battle]]);
        }
        sorted_battle_data.sort(function(a, b) {
            return b[1] - a[1];
        });
        if(sorted_battle_data.length >=4){
            for (let i=0; i<sorted_battle_data.length; i++) {
                const battle_detail = await getBattleFromBattleId(sorted_battle_data[i][0])
                home_battle_data.push(battle_detail.data[0])
                if(home_battle_data.length === 4){
                    return(home_battle_data);
                }
            }
        } else {
            for (let i=0; i<10; i++) {
                if(battle_ids.includes(sorted_battle_data[i][0])){
                    continue;
                }
                battle_ids.push(sorted_battle_data[i][0]);
                const battle_detail = await getBattleFromBattleId(sorted_battle_data[i][0])
                home_battle_data.push(battle_detail.data[0])
                if(home_battle_data.length === 4){
                    return(home_battle_data);
                } else if(sorted_battle_data.length < 4){
                    const overall_stats = await getOverAllStatsCount();
                    const battle_data = overall_stats.battles;
                    let sorted_battle_data2 = [];
                    for (let battle in battle_data) {
                        if(battle.length === 4){
                            continue;
                        }
                        sorted_battle_data2.push([battle, battle_data[battle].count]);
                    }
                    sorted_battle_data2.sort(function(a, b) {
                        return b[1] - a[1];
                    });
                    sorted_battle_data = sorted_battle_data.concat(sorted_battle_data2);
                }
            }
        }
    }
}

const createHomeGameData = async (user_id)=>{
    const home_battle_data = []
    const battle_ids = []
    const data = await getUserStatsCount(user_id)
    if(data === null || !data.total_games_count || data.total_games_count === 0){
        const overall_stats = await getOverAllStatsCount();
        const battle_data = overall_stats.games;
        let sorted_battle_data = [];
        for (let battle in battle_data) {
            if(battle.length === 4){
                continue;
            }
            sorted_battle_data.push([battle, battle_data[battle].count]);
        }
        if(sorted_battle_data.length < 4){
            const data = await getBattlesFromCategory("", 4, "a2e491d9-0d6c-438a-892b-fa76adbcf93e");
            return data.data
        }
        sorted_battle_data.sort(function(a, b) {
            return b[1] - a[1];
        });
        for (let i=0; i<4; i++) {
            const battle_detail = await getBattleFromBattleId(sorted_battle_data[i][0])
            home_battle_data.push(battle_detail.data[0])
            if(home_battle_data.length === 4){
                return(home_battle_data);
            }
        }
    } else {
        const battle_data = data.games_count;
        let sorted_battle_data = [];
        for (let battle in battle_data) {
            sorted_battle_data.push([battle, battle_data[battle]]);
        }
        sorted_battle_data.sort(function(a, b) {
            return b[1] - a[1];
        });
        if(sorted_battle_data.length >=4){
            for (let i=0; i<sorted_battle_data.length; i++) {
                const battle_detail = await getBattleFromBattleId(sorted_battle_data[i][0])
                home_battle_data.push(battle_detail.data[0])
                if(home_battle_data.length === 4){
                    return(home_battle_data);
                }
            }
        } else {
            for (let i=0; i<10; i++) {
                if(battle_ids.includes(sorted_battle_data[i][0])){
                    continue;
                }
                battle_ids.push(sorted_battle_data[i][0]);
                const battle_detail = await getBattleFromBattleId(sorted_battle_data[i][0])
                home_battle_data.push(battle_detail.data[0])
                if(home_battle_data.length === 4){
                    return(home_battle_data);
                } else if(sorted_battle_data.length < 4){
                    const overall_stats = await getOverAllStatsCount();
                    const battle_data = overall_stats.games;
                    let sorted_battle_data2 = [];
                    for (let battle in battle_data) {
                        if(battle.length === 4){
                            continue;
                        }
                        sorted_battle_data2.push([battle, battle_data[battle].count]);
                    }
                    sorted_battle_data2.sort(function(a, b) {
                        return b[1] - a[1];
                    });
                    sorted_battle_data = sorted_battle_data.concat(sorted_battle_data2);
                }
            }
        }
    }
}

const getHomeBanner = async () => {
    return {
        url: constants.HOME_BANNER_URL,
        message: constants.HOME_BANNER_MESSAGE,
        showBanner: constants.SHOW_HOME_BANNER
    }
}

const getHomeDataV2 = async (current_user_data) => {
    try{
        const user_data = await userDetail(current_user_data.user_id);
        const coins = user_data.Item.coins
        const axpi_romp = user_data.Item.axpi_romp?user_data.Item.axpi_romp:1000
        const name = user_data.Item.name
        const username = user_data.Item.username
        const status = user_data.Item.status
        const upcoming_contest = await upcomingContest();
        // const data = await battlesEnding();
        const quizzes= await createHomeQuizData(current_user_data.user_id)
        const battles= await createHomeBattleData(current_user_data.user_id)
        const notifications_data = await get_message(current_user_data.user_id);
        const notifications_old_data = await get_old_messages(current_user_data.user_id);
        const games= await createHomeGameData(current_user_data.user_id)
        const live_events = await getLiveEventsRandomData();
        const balance = await getWalletBalance(current_user_data.user_id);
        const feature_permissions = await getFeaturePermissions(current_user_data.user_id);
        const GameBannerData = await getHomeBanner(current_user_data.user_id);
        const notifications = {}
        notifications['data'] = notifications_data
        notifications['count'] = notifications_data.length
        notifications['old_data'] = notifications_old_data
        let data_to_send = {
            balance,
            coins,
            feature_permissions,
            axpi_romp,
            name,
            username,
            status,
            upcoming_contest,
            // live_battles,
            live_events,
            quizzes,
            games,
            battles,
            notifications,
            GameBannerData,
            checkpoints: constants.CHECKPOINTS,
            checkpoint_id: await checkCheckpoint(coins),
            user_checkpoints: await userCheckpoints(current_user_data.user_id)
        }
        return(data_to_send);
    } catch (e) {
        console.log(e)
        throw new Error(e)
    }
}

const getHomeBattleSearchData = async (text, limit) => {
    const filter = { "name": new RegExp(`${text}`, 'i') };
    return new Promise(((resolve, reject) => {
        if(!limit){
            limit = 10
        }
        battlesSyncModel.find(filter).limit(limit).exec().then(async (data) => {
            resolve(data)
        })
    }))
}

const getMostpopularData = async () => {
    const home_most_popular_data = []
    const overall_stats = await getOverAllStatsCount();
    const quiz_data = overall_stats.quizzes;
    const battle_data = overall_stats.battles;
    const quiz_leaderboard_data = overall_stats.quiz_leaderboard;
    let sorted_data = [];
    for (let quiz in quiz_data) {
        if(quiz.length === 4){
            continue;
        }
        sorted_data.push([quiz, quiz_data[quiz].count]);
    }
    for (let battle in battle_data) {
        if(battle.length === 4){
            continue;
        }
        sorted_data.push([battle, battle_data[battle].count]);
    }
    for (let quiz_leaderboard in quiz_leaderboard_data) {
        if(quiz_leaderboard.length === 4){
            continue;
        }
        sorted_data.push([quiz_leaderboard, quiz_leaderboard_data[quiz_leaderboard].count]);
    }
    sorted_data.sort(function(a, b) {
        return b[1] - a[1];
    });
    for (let i=0; i<4; i++) {
        const battle_detail = await getBattleFromBattleId(sorted_data[i][0])
        home_most_popular_data.push(battle_detail.data[0])
        if(home_most_popular_data.length === 2){
            return(home_most_popular_data);
        }
    }
}

const getMostFrequentlyPlayedData = async () => {
    return new Promise((async (resolve, reject) => {
        const home_most_frequent_data = []
        let key;
        const today = new Date();
        let month = today.getMonth();
        if (today.getDate() < 15) {
            month = month - 1;
            if (month < 0) {
                month = 11;
            }
        }
        key = "month_" + month.toString();
        
        const overall_stats = await getOverAllStatsCount();
        const quiz_data = overall_stats.quizzes;
        const battle_data = overall_stats.battles;
        const quiz_leaderboard_data = overall_stats.quiz_leaderboard;
        let sorted_data = [];
        for (let quiz in quiz_data) {
            if(quiz.length === 4){
                continue;
            }
            if(new Date().getFullYear() in quiz_data[quiz] && key in quiz_data[quiz][new Date().getFullYear()]){
                sorted_data.push([quiz, quiz_data[quiz][new Date().getFullYear()][key].count]);
            }
        }
        for (let battle in battle_data) {
            if(battle.length === 4){
                continue;
            }
            if(new Date().getFullYear() in battle_data[battle] && key in battle_data[battle][new Date().getFullYear()]){
                sorted_data.push([battle, battle_data[battle][new Date().getFullYear()][key].count]);
            }
        }
        for (let quiz_leaderboard in quiz_leaderboard_data) {
            if(quiz_leaderboard.length === 4){
                continue;
            }
            if(new Date().getFullYear() in quiz_leaderboard_data[quiz_leaderboard] && key in quiz_leaderboard_data[quiz_leaderboard][new Date().getFullYear()]){
                sorted_data.push([quiz_leaderboard, quiz_leaderboard_data[quiz_leaderboard][new Date().getFullYear()][key].count]);
            }
        }
        sorted_data.sort(function(a, b) {
            return b[1] - a[1];
        });
        for (let i=0; i<8; i++) {
            const battle_detail = await getBattleFromBattleId(sorted_data[i][0])
            home_most_frequent_data.push(battle_detail.data[0])
            if(home_most_frequent_data.length === 8){
                resolve(home_most_frequent_data);
            }
        }
    }))
}

const getLastPlayedQuizOrBattle = async (user_id) => {
    try {
        const Quiz = require('../db/modules/quizzes');
        const UserBattle = require('../db/modules/user_battles');
        const QuizLeaderboard = require('../db/modules/quiz_leaderboard_details');

        // Fetch the latest 2 entries from each model
        const [quizResults, battleResults, leaderboardResults] = await Promise.all([
            Quiz.find({ user_id: user_id })
                .sort({ timestamp: -1 })
                .limit(2)
                .lean(),
            UserBattle.find({
                $or: [
                    { 'player1.id': user_id },
                    { 'player2.id': user_id },
                ],
            })
                .sort({ start_timestamp: -1 })
                .limit(2)
                .lean(),
            QuizLeaderboard.find({ user_id: user_id })
                .sort({ timestamp: -1 })
                .limit(2)
                .lean(),
        ]);

        // Add a `type` field to each entry to identify its source
        const annotatedQuizResults = quizResults.map(entry => ({ ...entry, type: 'quiz', uniqueId: entry.quiz_id }));
        const annotatedBattleResults = battleResults.map(entry => ({ ...entry, type: 'battle', uniqueId: entry.battle_id }));
        const annotatedLeaderboardResults = leaderboardResults.map(entry => ({ ...entry, type: 'quiz_leaderboard', uniqueId: entry.quiz_leaderboard_id }));

        // Combine all results
        const combinedResults = [
            ...annotatedQuizResults,
            ...annotatedBattleResults,
            ...annotatedLeaderboardResults,
        ];

        // Ensure unique entries by `uniqueId`
        const uniqueResultsMap = new Map();
        combinedResults.forEach(entry => {
            if (!uniqueResultsMap.has(entry.uniqueId)) {
                uniqueResultsMap.set(entry.uniqueId, entry);
            }
        });

        // Convert the map back to an array
        const uniqueResults = Array.from(uniqueResultsMap.values());

        // Sort by the appropriate timestamp
        uniqueResults.sort((a, b) => {
            const timestampA = a.type === 'battle' ? a.start_timestamp : a.timestamp;
            const timestampB = b.type === 'battle' ? b.start_timestamp : b.timestamp;
            return new Date(timestampB) - new Date(timestampA);
        });

        // Return the top 2 entries
        return uniqueResults.slice(0, 2);
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
};

const getHomeDataV3 = async (current_user_data) => {
    try{
        const user_data = await userDetail(current_user_data.user_id);
        const coins = user_data.Item.coins
        const axpi_romp = user_data.Item.axpi_romp?user_data.Item.axpi_romp:1000
        const name = user_data.Item.name
        const username = user_data.Item.username
        const status = user_data.Item.status
        const live_events = await getLiveEventsRandomData();
        const last_played = await getLastPlayedQuizOrBattle(current_user_data.user_id);
        const last_played_data =[]
        for (const item of last_played) {
            const uniqueId= item['uniqueId'];
            let data = await getBattleFromBattleId(uniqueId)
            last_played_data.push(data['data'][0])
        }
        const most_popular_data = await getMostpopularData();
        const most_frequent_data = await getMostFrequentlyPlayedData();
        const upcoming_contest = await upcomingContest();
        const notifications_data = await get_message(current_user_data.user_id);
        const notifications_old_data = await get_old_messages(current_user_data.user_id);
        const balance = await getWalletBalance(current_user_data.user_id);
        const feature_permissions = await getFeaturePermissions(current_user_data.user_id);
        const GameBannerData = await getHomeBanner(current_user_data.user_id);
        const notifications = {}
        notifications['data'] = notifications_data
        notifications['count'] = notifications_data.length
        notifications['old_data'] = notifications_old_data
        let data_to_send = {
            balance,
            coins,
            feature_permissions,
            axpi_romp,
            name,
            username,
            status,
            upcoming_contest,
            live_events,
            last_played: last_played_data,
            most_popular: most_popular_data,
            most_frequent: most_frequent_data,
            notifications,
            GameBannerData,
            checkpoints: constants.CHECKPOINTS,
            checkpoint_id: await checkCheckpoint(coins),
            user_checkpoints: await userCheckpoints(current_user_data.user_id),
        }
        return(data_to_send);
    } catch (e) {
        console.log(e)
        throw new Error(e)
    }
}

module.exports = {
    getHomeData,
    report_battle,
    getBattleDetail,
    getVotersDetail,
    live_battles_without_bots,
    old_battles_without_bots_and_results,
    updateBattleReportedCount,
    battlesEnding,
    createBattlesEndingData,
    getHomeDataV2,
    getHomeBattleSearchData,
    live_battles_without_bots_in_11,
    getHomeDataV3
}