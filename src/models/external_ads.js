const AWS = require("aws-sdk");
const key = require("../../config/keys");
const { updateUserStatsCount, updateOverAllCount, getUserStatsCount } = require("./index");
const externalAdsModel = require("../db/modules/external_ads");

// Ads Platform: 1-Admob, 2-Unity, 3-Applovin
// Ads Types: 1- Banner Ad, 2- Interstitial Ad 3- Reward Ad

AWS.config.update({
  region: key.region,
  accessKeyId: key.AWS_ACCESS_KEY,
  secretAccessKey: key.AWS_SECRET_ACCESS_KEY,
});

const table = key.table_ads;

const docClient = new AWS.DynamoDB.DocumentClient();

const ad_priority = [2,1,3]

const getCurrentWeekNumber = () =>{
  const adjustedDate = new Date().getDate()+new Date().getDay();
  const prefixes = ['0', '1', '2', '3', '4', '5'];
  return (parseInt(prefixes[0 | adjustedDate / 7])+1);
}

const getAdUnits = async (ad_id) => {
  const params = {
    TableName: table,
    IndexName: "type-ad_id-index",
    KeyConditionExpression: '#type = :hkey and #id= :hkey2',
    ExpressionAttributeNames: { '#type': 'type', '#id': 'ad_id' },
    ExpressionAttributeValues: { ':hkey': 'ad_unit', ':hkey2': ad_id },
  };

  return new Promise(((resolve, reject) => {
    docClient.query(params, async (err, data) => {
      if (err) {
        reject(err);
      } else {
          let task_to_complete = data.Items.length;
          let task_completed = 0;
          const result = [];
          data.Items.map(item=>{
            const params = {
              TableName: table,
              KeyConditionExpression: '#type = :hkey and #id= :hkey2',
              ExpressionAttributeNames: { '#type': 'type', '#id': 'id' },
              ExpressionAttributeValues: { ':hkey': 'ad_platform', ':hkey2': (item.ad_platform_id).toString() },
            };
            docClient.query(params,(err, data2) => {
              if (err) {
                reject(err);
              } else {
                task_completed = task_completed + 1;
                if(data2.Items[0].is_enabled === 1){
                  result.push(item);
                }
                if(task_completed === task_to_complete) {
                  resolve(result);
                }
              }
          })
        })
      }
    });
  }));
}

const selectAd = async (ad_units, ad_platform_id) => {
  let data = ad_units.filter(function (el) {
    return el.ad_platform_id === ad_platform_id
  });
  return data;
}

const insertExternalAdData = async (item) => {
  const new_data = new externalAdsModel(item)
  return new Promise(((resolve, reject) => {
    new_data.save(async function (err, result) {
      if (err) {
        reject(err);
      }
      else {
        try {
          resolve(result)
        }
        catch (exec) {
          reject(exec)
        }
      }
    })
  }))
}

const selectAdUnitIfDataExists = async (ad_unit_data, user_id) => {
  let ad_data = externalAdsModel.find({ user_id: user_id, show_ad: true, ad_id: ad_unit_data[0].ad_id}).sort({ "timestamp": -1 }).limit(1)
  let priority = 1
  return new Promise(((resolve, reject) => {
    ad_data.exec(async function (err, data) {
      if(data.length === 0){
        let ad_result = await selectAd(ad_unit_data, ad_priority[0])
        if (ad_result.length === 0) {
          ad_result = await selectAd(ad_unit_data, ad_priority[1])
          if (ad_result.length === 0) {
            ad_result = await selectAd(ad_unit_data, ad_priority[2])
            if (ad_result.length === 0) {
              resolve({});
            }
          }
        }
        resolve(ad_result);
      }
      else {
        let last_shown_ad_platform_id = data[0].ad_platform_id;
        if(last_shown_ad_platform_id === 3){
          priority = 1
        } else {
          priority = last_shown_ad_platform_id + 1
        }
        let ad_result = await selectAd(ad_unit_data, priority)
        if(ad_result.length === 0) {
          if(priority === 3){
            priority = 1
          } else {
            priority = priority + 1
          }
          ad_result = await selectAd(ad_unit_data, priority)
          if(ad_result.length === 0) {
            if(priority === 3){
              priority = 1
            } else {
              priority = priority + 1
            }
          }
          ad_result = await selectAd(ad_unit_data, priority)
          if(ad_result.length === 0) {
            resolve({})
          }
        }
        resolve(ad_result);
      }
    })
  }))
}

const adData = async (user_id, ad_id) => {
  if (key.show_ads == "true" || key.show_ads) {
    return new Promise((async (resolve, reject) => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      let ad_count = await externalAdsModel.find({ user_id: user_id, show_ad: true, ad_id: ad_id, timestamp: { $gte: startOfDay, $lte: endOfDay}}).count();
      if (ad_count >= 11) resolve({ show_ad: false })
      const ad_unit_data = await getAdUnits(ad_id);
      if(ad_unit_data.length === 0){
        resolve({ show_ad: false })
      } else {
        const ad_result = await selectAdUnitIfDataExists(ad_unit_data, user_id)
      const user_stats = await getUserStatsCount(user_id);
      if(ad_result[0].count == 1 || (user_stats && user_stats['requested_ad_count'] && user_stats['requested_ad_count'][ad_result[0].ad_id] && (user_stats['requested_ad_count'][ad_result[0].ad_id] % ad_result[0].count == 0))){
        await insertExternalAdData({
          show_ad: true,
          ad_platform_id: ad_result[0].ad_platform_id,
          ad_unit_id: ad_result[0].ad_unit_id,
          ad_type_id: ad_result[0].ad_type_id,
          user_id: user_id,
          ad_id: ad_result[0].ad_id,
          timestamp: +new Date()
        });
        await updateUserStatsCount(user_id, `requested_ad_count.${ad_result[0].ad_id}`)
        await updateUserStatsCount(user_id, "total_ad_count")
        await updateUserStatsCount(user_id, `ad_count.${ad_result[0].ad_unit_id}`)
        await updateOverAllCount(`ad_count`)
        await updateOverAllCount(`ads.${new Date().getFullYear()}.count`)
        await updateOverAllCount(`ads.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
        await updateOverAllCount(`ads.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
        await updateOverAllCount(`ads.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
        await updateOverAllCount(`ads.${ad_result[0].ad_unit_id}.${new Date().getFullYear()}.count`)
        await updateOverAllCount(`ads.${ad_result[0].ad_unit_id}.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
        await updateOverAllCount(`ads.${ad_result[0].ad_unit_id}.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
        await updateOverAllCount(`ads.${ad_result[0].ad_unit_id}.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
        resolve({
          show_ad: true,
          ad_platform_id: ad_result[0].ad_platform_id,
          ad_unit_id: ad_result[0].ad_unit_id,
          ad_type_id: ad_result[0].ad_type_id,
          user_id: user_id,
          timestamp: +new Date()
        })
        } else {
          await updateUserStatsCount(user_id, `requested_ad_count.${ad_result[0].ad_id}`)
          resolve({ show_ad: false })
        }
      }
    }))
  }
}

module.exports = { adData };
