const cron = require('node-cron');
const battlesSyncModel = require('../db/modules/battlesSync');
const { getAllBattles } = require('../models');

const battlesSyncCron = async () => {
    console.log("Scheduler to Sync Battle in MongoDB Started");
    cron.schedule('0 */6 * * *', async () => {
        console.log("Battle sync cron running...")
        const battles = await getAllBattles();
        if(battles){
            battles.data.map(async (battle)=>{
                const data_query = battlesSyncModel.updateOne({battle_id: battle.id}, 
                    {$set: {
                        module: battle.module,
                        name: battle.name,
                        entry_fee: battle.entryFee,
                        entry_fee_type: battle.entryFeeType,
                        reward: battle.rewardType,
                        reward_type: battle.rewardType,
                        start_date: battle.battle_date,
                        end_date: battle.endsOn,
                        timestamp: +new Date()}
                    }, {upsert: true})
                data_query.exec(async function (err, data) {
                    if (err) {
                        console.log("Error while updating battles data in MongoDB"+JSON.stringify(err))
                    }
                    else{
                        if(data.upsertedCount){
                            console.log(`Updated ${battle.name} on ${new Date()}`)
                        }
                    }
                })
            })
        }
    })
}

module.exports = { battlesSyncCron }