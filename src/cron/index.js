const cron = require('node-cron');
const schedule = require('node-schedule');
const { getAllBattlesFromModule, getBattleIsPublished, updateBattleIsPublished, deleteVoteOldAllData, deleteAirtimeFile, changeTransactionStatus, insertAirtimeFile } = require('../models');
const { saveReferralLeaderBoardData, referral_leaderboard_result_declare } = require('../models/referral_leaderboard');
const { saveQuizLeaderBoardData, quizLeaderboardResultDeclare, updateStartEndDate, updateBots } = require('../models/quiz_leaderboard');
const {redis, deleteKeysByPrefix} = require('../models/redis');
const keys = require('../../config/keys');
const constants = require('../../config/constants');
const { createBotBattles } = require('../models/bots_battle');
const { live_battles_without_bots, old_battles_without_bots_and_results, live_battles_without_bots_in_11 } = require('../models/home');
const { declare_result } = require('../start_battle/battle_result');
const axios = require('axios');

const referralLeaderboardCron = async () => {
  console.log("Scheduler to save Refererral Leaderboard in every 10 minutes started");
  cron.schedule('*/10 * * * *', async () => {
    const data = await getAllBattlesFromModule('referral_leaderboard');
    data.map(async item=>{
      let start_date = item.battle_date.toString()
      if((item.battle_date).toString().length === 7){
        start_date = "0"+(item.battle_date).toString()
      }
      start_date = +new Date(start_date.slice(2,4) + "/" + start_date.slice(0,2) + "/" + start_date.slice(4))
      const ends_on = item.endsOn
      const id = item.id
      const current_time = new Date()
      let currentOffset = current_time.getTimezoneOffset();
      let ISTOffset = 330;
      let ISTTime = +new Date(current_time.getTime() + (ISTOffset + currentOffset)*60000)
      if(ISTTime >= start_date &&  ISTTime <= ends_on){
        const is_published = await getBattleIsPublished(id)
        if(!is_published.is_published){
          await updateBattleIsPublished(id, true);
        }
        await saveReferralLeaderBoardData(id, start_date, ends_on)
      }
    })
  });
}

const referralLeaderboardResultCron = async () => {
  const data = await getAllBattlesFromModule('referral_leaderboard');
  data.map(async item=>{
    let start_date = item.battle_date.toString()
    if((item.battle_date).toString().length === 7){
      start_date = "0"+(item.battle_date).toString()
    }
    start_date = +new Date(start_date.slice(2,4) + "/" + start_date.slice(0,2) + "/" + start_date.slice(4))
    const ends_on = item.endsOn
    const id = item.id
    const current_time = new Date()
    let currentOffset = current_time.getTimezoneOffset();
    let ISTOffset = 330;
    let ISTTime = +new Date(current_time.getTime() + (ISTOffset + currentOffset)*60000)
    if(ISTTime >= start_date &&  ISTTime <= ends_on){
      console.log(`Result of Referral Leaderboard with id: ${id} scheduler started`);
      schedule.scheduleJob(ends_on, async function () {
        await referral_leaderboard_result_declare(id, item);
      })
    }
  })
}

const quizLeaderboardCron = async () => {
  console.log(`Scheduler to save Quiz Leaderboard in every ${keys.quiz_leaderboard_refresh_time} minutes started`);
  cron.schedule(`*/${keys.quiz_leaderboard_refresh_time} * * * *`, async () => {
    const data = await getAllBattlesFromModule('quiz_leaderboard');
    let data_completed = 0;
    let data_to_completed = data.length;
    return new Promise(async (resolve, reject) => {
      data.map(async item=>{
        let start_date = item.battle_date.toString()
        if((item.battle_date).toString().length === 7){
          start_date = "0"+(item.battle_date).toString()
        }
        start_date = +new Date(start_date.slice(2,4) + "/" + start_date.slice(0,2) + "/" + start_date.slice(4))
        const ends_on = item.endsOn
        const id = item.id
        const current_time = new Date()
        let currentOffset = current_time.getTimezoneOffset();
        let ISTOffset = 330;
        let ISTTime = +new Date(current_time.getTime() + (ISTOffset + currentOffset)*60000)
        if(ISTTime >= start_date &&  ISTTime <= ends_on){
          const is_published = await getBattleIsPublished(id)
          if(!is_published.is_published){
            await updateBattleIsPublished(id, true);
            await updateBots(id)
          }
          await saveQuizLeaderBoardData(id, start_date, ends_on, item.name)
        } else {
          const is_published = await getBattleIsPublished(id)
          if(is_published.is_published){
            await updateBattleIsPublished(id, false);
          }
        }
        data_completed = data_completed + 1
        if(data_to_completed === data_completed){
          console.log("All Quiz Leaderboards updated")
          resolve("completed")
        }
      })
    })
  });
}

const quizLeaderboardCronBeforeResult = async () => {
  console.log(`Scheduler to update is_published at 11:31 PM started`);
  cron.schedule('31 23 * * *', async () => {
    const data = await getAllBattlesFromModule('quiz_leaderboard');
    let data_completed = 0;
    let data_to_completed = data.length;
    return new Promise(async (resolve, reject) => {
      data.map(async item=>{
        let start_date = item.battle_date.toString()
        if((item.battle_date).toString().length === 7){
          start_date = "0"+(item.battle_date).toString()
        }
        start_date = +new Date(start_date.slice(2,4) + "/" + start_date.slice(0,2) + "/" + start_date.slice(4))
        const ends_on = item.endsOn
        const id = item.id
        const current_time = new Date()
        let currentOffset = current_time.getTimezoneOffset();
        let ISTOffset = 330;
        let ISTTime = +new Date(current_time.getTime() + (ISTOffset + currentOffset)*60000)
        if(ISTTime >= start_date &&  ISTTime <= ends_on){
          const is_published = await getBattleIsPublished(id)
          if(!is_published.is_published){
            await updateBattleIsPublished(id, true);
            await updateBots(id)
          }
          await saveQuizLeaderBoardData(id, start_date, ends_on, item.name)
        } else {
          const is_published = await getBattleIsPublished(id)
          if(is_published.is_published){
            await updateBattleIsPublished(id, false);
          }
        }
        data_completed = data_completed + 1
        if(data_to_completed === data_completed){
          console.log("All Quiz Leaderboards updated")
          resolve("completed")
        }
      })
    })
  });
}

const quizLeaderboardResultCron = async () => {
  cron.schedule('35 23 * * *', async () => {
    const data = await getAllBattlesFromModule('quiz_leaderboard');
    data.map(async item=>{
      let start_date = item.battle_date.toString()
      if((item.battle_date).toString().length === 7){
        start_date = "0"+(item.battle_date).toString()
      }
      start_date = +new Date(start_date.slice(2,4) + "/" + start_date.slice(0,2) + "/" + start_date.slice(4))
      const ends_on = item.endsOn
      const id = item.id
      const name = item.name
      const current_time = new Date()
      let currentOffset = current_time.getTimezoneOffset();
      let ISTOffset = 330;
      let ISTTime = +new Date(current_time.getTime() + (ISTOffset + currentOffset)*60000)
      if(ISTTime >= start_date && ends_on <= ISTTime){
        await saveQuizLeaderBoardData(id, start_date, ends_on, item.name)
        await quizLeaderboardResultDeclare(id, item);
        console.log(`Result of Quiz Leaderboard with id: ${id} and name: ${name} ends at ${new Date(ends_on)} is declared`);
      } else {
        console.log(`Result not declared of Quiz Leaderboard with id: ${id} and name: ${name} ends at ${new Date(ends_on)}`);
      }
    })
  })
}

const scheduleQuizLeaderboardEvents = async () => {
  console.log(`Scheduler to update endsOn and startDate of ended quiz leaderboard at 12:01 AM started`);
  cron.schedule('01 00 * * *', async () => {
    const data = await getAllBattlesFromModule('quiz_leaderboard');
    let date_to_save = ''
    let any_data_updated = 0
    let data_to_complete = data.length
    let data_completed =0
    data.map(async item=>{
      if(item.endsOn < +new Date()){
        any_data_updated = 1
        let ends_on = new Date()
        ends_on.setDate(ends_on.getDate() + 4);
        ends_on.setHours(23);
        ends_on.setMinutes(30);
        ends_on = +new Date(ends_on);
        const id = item.id
        const name = item.name
        month = new Date().getMonth()+1
        if(month.toString().length == 1) {
          month = "0"+ month.toString()
        }
        date_to_save = new Date().getDate() + "" + month + "" + new Date().getFullYear()
        await updateStartEndDate(id, parseInt(date_to_save), ends_on)
        await redis.del(`quiz_leaderboard_bots:${id}`)
        console.log(`Deleted redis key quiz_leaderboard_bots:${id}`);
        console.log("Updated Ends On and Start Date of event: "+name)
      }
      data_completed = data_completed + 1
      if(data_completed == data_to_complete){
        if(any_data_updated){
          console.log("*************************Updated all event endsOn successfully**************************")
        } else {
          console.log("No Data updated for Quiz Leaderboard event")
        }
      }
    })
    await deleteKeysByPrefix(`quiz_leaderboard_score:`)
    await deleteKeysByPrefix(`quiz_leaderboard_detail:`)
    await redis.del(`live_events`)
    console.log(`Deleted redis key live_events`);
  })
}

const quizLeaderboardCronAfterEventStart = async () => {
  console.log(`Scheduler to update is_published at 12:02 AM started`);
  cron.schedule('02 00 * * *', async () => {
    const data = await getAllBattlesFromModule('quiz_leaderboard');
    let data_completed = 0;
    let data_to_completed = data.length;
    return new Promise(async (resolve, reject) => {
      data.map(async item=>{
        let start_date = item.battle_date.toString()
        if((item.battle_date).toString().length === 7){
          start_date = "0"+(item.battle_date).toString()
        }
        start_date = +new Date(start_date.slice(2,4) + "/" + start_date.slice(0,2) + "/" + start_date.slice(4))
        const ends_on = item.endsOn
        const id = item.id
        const current_time = new Date()
        let currentOffset = current_time.getTimezoneOffset();
        let ISTOffset = 330;
        let ISTTime = +new Date(current_time.getTime() + (ISTOffset + currentOffset)*60000)
        if(ISTTime >= start_date &&  ISTTime <= ends_on){
          const is_published = await getBattleIsPublished(id)
          if(!is_published.is_published){
            await updateBattleIsPublished(id, true);
            await updateBots(id)
          }
          await saveQuizLeaderBoardData(id, start_date, ends_on, item.name)
        } else {
          const is_published = await getBattleIsPublished(id)
          if(is_published.is_published){
            await updateBattleIsPublished(id, false);
          }
        }
        data_completed = data_completed + 1
        if(data_to_completed === data_completed){
          console.log("All Quiz Leaderboards updated")
          resolve("completed")
        }
      })
    })
  });
}

const deleteVoteOldData = async () => {
  console.log("Cron to delete voters old data started...")
  cron.schedule('15 03 * * *', async () => {
    console.log("Inside delete votes data cron")
      await deleteVoteOldAllData();
      console.log("Vote Old Data Deleted Successfully")
  })
}

const deleteAirtimeOperatorFile = async () => {
  console.log("Cron to delete Airtime Operator File Started...")
  cron.schedule('00 04 * * *', async () => {
      await deleteAirtimeFile();
      console.log("Airtime File Deleted Successfully")
  })
}

const insertAirtimeOperatorFile = async () => {
  console.log("Cron to insert Airtime Operator File Started...")
  cron.schedule('01 04 * * *', async () => {
    const countries = constants.SUPPORTED_COUNTRIES_IN_AIRTIME;
    for(let i=0; i<constants.SUPPORTED_COUNTRIES_IN_AIRTIME.length; i++) {
      await insertAirtimeFile(countries[i]);
      console.log(`Airtime File Inserted Successfully for ${countries[i]} country`)
    }
  })
}

const reQueryCron = async () => {
  console.log("Requery cron Started...")
  cron.schedule('*/10 * * * *', async () => {
      await changeTransactionStatus();
  })
}

// '0 0 * * *' - runs in every midnight
// '*/5 * * * *' - runs in every 5 minutes
// '0 */4 * * *' - runs in every 4 hours

const createBattleScheduler = async () => {
  console.log(`Scheduler to create bot user battles in every ${process.env.CREATE_BOT_BATTLE_TIME} hour started`)
  schedule.scheduleJob(`0 */${process.env.CREATE_BOT_BATTLE_TIME} * * *`, async function () {
    await createBotBattles()
  })
}

const battleScheduler = async (data) => {
  schedule.scheduleJob(data.end_timestamp, async function () {
    await declare_result(data);
  })
}

const scheduleLiveBattlesWithoutBots = async () =>{
  console.log("Scheduler to schedule live battles according to there end timestamps started...")
    const data = await live_battles_without_bots()
    for(let data_index in data){
      await battleScheduler(data[data_index])
    }
}

const scheduleLiveBattlesWithoutBotsIn10Min = async () =>{
  console.log("Scheduler to schedule live battles according to there end timestamps in every 10 min started...")
  schedule.scheduleJob(`*/10 * * * *`, async function () {
    const data = await live_battles_without_bots_in_11()
    for(let data_index in data){
      await battleScheduler(data[data_index])
    }
  })
}

const declareResultOfOldBattlesWithoutBots = async () => {
  console.log("Scheduler to declare result of old battles started for daily at 2:00 AM...")
  cron.schedule('00 02 * * *', async () => {
    const battles_details = await old_battles_without_bots_and_results();
    for(let data_index in battles_details){
      await declare_result(battles_details[data_index]);
    }
  })
}

const pingLambdaHealthCheck = async () => {
  const healthCheckURL = 'https://api.talentitan.com/health';
  try {
    const response = await axios.get(healthCheckURL);
    console.log(`Health Check Successful: ${response.data.data}`);
  } catch (error) {
    console.error(`Health Check Failed: ${error}`);
  }
};

const startHealthCheckScheduler = () => {
  console.log("Starting Lambda Health Check Scheduler in every 2 min...");

  cron.schedule('*/2 * * * *', async () => {
    await pingLambdaHealthCheck();
  });
};

module.exports = { referralLeaderboardCron, referralLeaderboardResultCron, quizLeaderboardCron, quizLeaderboardResultCron, scheduleQuizLeaderboardEvents, deleteVoteOldData, 
  deleteAirtimeOperatorFile, reQueryCron, quizLeaderboardCronBeforeResult, insertAirtimeOperatorFile, quizLeaderboardCronAfterEventStart, createBattleScheduler, scheduleLiveBattlesWithoutBots,
  declareResultOfOldBattlesWithoutBots, scheduleLiveBattlesWithoutBotsIn10Min, startHealthCheckScheduler}