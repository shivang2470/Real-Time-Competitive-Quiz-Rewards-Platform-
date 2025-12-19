const fs = require('fs');
const path = require('path');
const keys = require("../../config/keys")
const axios = require('axios');
const { insertActivity } = require('./activities');
const { AMAZON_GIFT_CARD } = require('../../config/gift_cards');
const constants = require('../../config/constants');
const {redis} = require('./redis');
const toeknModel = require('../db/modules/tokens');

const airtameOperators = 'config/airtime_operators.json';

const getReloadlyBalance = async (token, type) => {
    const auth = 'Bearer ' + token;
    const options = {
        method: 'GET',
        url: keys.reloadly_giftcard_base_url+"/accounts/balance",
        headers: {
          'content-type': 'application/json',
          'Authorization': auth.replace("\n","")
        },
    };
    if(type == "airtime"){
        options.url = keys.reloadly_airtime_base_url+"/accounts/balance";
    }
    return new Promise(((resolve, reject) => {
        axios.request(options).then(async function (response) {
            resolve({
                status: true,
                status_code: response.status,
                data: response.data
            })
        }).catch(async function (error_response) {
            reject({
                status: false,
                status_code: error_response.response.status,
                data: error_response.response
            })
        });
    }))
}

const generateFreshToken = async (type) => {
    const options = {
        method: 'POST',
        url: "https://auth.reloadly.com/oauth/token",
        headers: {
          'content-type': 'application/json'
        },
        data: {
            "client_id": keys.reloadly_client_id,
            "client_secret": keys.reloadly_client_secret,
            "grant_type": keys.reloadly_grant_type,
            "audience": keys.reloadly_giftcard_base_url
        }
    };
    if(type == "airtime"){
        options.data.audience = keys.reloadly_airtime_base_url;
    }
    return new Promise(((resolve, reject) => {
        axios.request(options).then(function (response) {
            resolve({
                status: true,
                status_code: response.status,
                data: response.data
            })
        }).catch(function (error_response) {
            reject({
                status: false,
                status_code: error_response.response.status,
                data: error_response.response
            })
        });
    }))
}

const saveAuthorizationToken   = async (type) => {
    return new Promise(async (resolve, reject) => {
        try {
            // Check if token already exists for the type
            let tokenRecord = await toeknModel.findOne({ type });

            if (!tokenRecord) {
                // If no record exists, create a new one
                console.log(`No token found for type: ${type}. Creating new token.`);
                let response = await generateFreshToken(type).catch(async error_response => {
                    console.log(error_response);
                    await insertActivity(
                        "",
                        "",
                        "Reloadly Token Generation",
                        "Error occurred in generateFreshToken function",
                        "",
                        error_response
                    );
                    reject(error_response);
                });

                if (response && response.status_code === 200) {
                    const newToken = new toeknModel({
                        token: response.data.access_token,
                        type,
                        updated_at: Date.now(),
                        created_at: Date.now()
                    });

                    await newToken.save();
                    console.log(`New token for ${type} saved to database successfully.`);
                    resolve("Token saved successfully!");
                }
            } else {
                // Token exists, validate it
                let response = await getReloadlyBalance(tokenRecord.token, type).catch(async error_response => {
                    if (!error_response.status && error_response.status_code === 401) {
                        // Token is invalid, generate a new one
                        console.log(`Token for ${type} is invalid. Generating a new one.`);
                        let freshResponse = await generateFreshToken(type).catch(async error_response => {
                            console.log(error_response);
                            await insertActivity(
                                "",
                                "",
                                "Reloadly Token Generation",
                                "Error occurred in generateFreshToken function",
                                "",
                                error_response
                            );
                            reject(error_response);
                        });

                        if (freshResponse && freshResponse.status_code === 200) {
                            tokenRecord.token = freshResponse.data.access_token;
                            tokenRecord.updated_at = Date.now();
                            await tokenRecord.save();
                            console.log(`Updated token for ${type} saved to database.`);
                            resolve("Token updated successfully!");
                        }
                    }
                });

                if (response && (response.status_code === 200 || response.status_code === 201)) {
                    console.log(`Reloadly Balance (${type}) is: ${response.data.balance}`);
                    console.log(`Reloadly (${type}) token is correct, so not updating it again!`);
                    resolve("Reloadly token is correct, so not updating it again!");
                }
            }
        } catch (error) {
            console.error("Error in saveAuthorizationToken function:", error);
            reject(error);
        }
    });
};

const getReloadlyAccessToken = async (type='giftcard') => {
    const data = await toeknModel.findOne({type: type}, {token: 1}).exec();
    return data.token;
}

const getIndiaAirtimeOperators = async (country_code) => {
    let data = {}
    if(fs.existsSync(airtameOperators))
        data = JSON.parse(fs.readFileSync(airtameOperators));
    if(Object.keys(data).length)
        return data
    let token = await getReloadlyAccessToken("airtime");
    let auth = 'Bearer ' + token;
    let options = {
        method: 'GET',
        url: keys.reloadly_airtime_base_url+`/operators/countries/${country_code}`,
        headers: {
          'content-type': 'application/json',
          'Authorization': auth.replace("\n","")
        },
    };
    return new Promise(((resolve, reject) => {
        axios.request(options).then(async function (response) {
            fs.writeFileSync(airtameOperators, JSON.stringify(response.data));
            resolve(response.data)
        }).catch(async function (error_response) {
            if(error_response.response.status === 401){
                const data = await saveAuthorizationToken ("airtime")
                if(data){
                    token = await getReloadlyAccessToken("airtime");
                    auth = 'Bearer ' + token;
                    options = {
                        method: 'GET',
                        url: keys.reloadly_airtime_base_url+`/operators/countries/${country_code}`,
                        headers: {
                        'content-type': 'application/json',
                        'Authorization': auth.replace("\n","")
                        },
                    };
                    axios.request(options).then(async function (response) {
                        fs.writeFileSync(airtameOperators, JSON.stringify(response.data));
                        resolve(response.data)
                    })
                }
            } else {
                reject(error_response);
            }
        });
    }))
}

const getGiftCard = async (product_code) => {
    let token = await getReloadlyAccessToken();
    console.log(token)
    let auth = 'Bearer ' + token;
    let options = {
        method: 'GET',
        url: keys.reloadly_giftcard_base_url+`/products/${product_code}`,
        headers: {
          'content-type': 'application/json',
          'Authorization': auth.replace("\n","")
        },
    };
    return new Promise(((resolve, reject) => {
        axios.request(options).then(async function (response) {
            resolve(response.data)
        }).catch(async function (error_response) {
            console.error(error_response)
            if(error_response.response.status === 401){
                const data = await saveAuthorizationToken ("giftcard")
                if(data){
                    token = await getReloadlyAccessToken("giftcard");
                    auth = 'Bearer ' + token;
                    options = {
                        method: 'GET',
                        url: keys.reloadly_giftcard_base_url+`products/${product_code}`,
                        headers: {
                        'content-type': 'application/json',
                        'Authorization': auth.replace("\n","")
                        },
                    };
                    axios.request(options).then(async function (response) {
                        resolve(response.data)
                    })
                }
            } else {
                reject(error_response);
            }
        });
    }))
}

const getGiftCards = async () => {
    if(await redis.get("gift_cards"))
        return JSON.parse(await redis.get("gift_cards"))
    const giftCards = []
    const products = constants.gift_card_products;
    for(let i = 0; i < products.length; i++){
        if(products[i] == 1){
            giftCards.push(AMAZON_GIFT_CARD)
        } else {
            giftCards.push(await getGiftCard(products[i]))
        }
        if(giftCards.length == products.length){
            await redis.set("gift_cards", JSON.stringify(giftCards), {EX: 43200})
            return giftCards;
        }
    }
}

const orderGiftCard = async (data) => {
    let token = await getReloadlyAccessToken();
    let auth = 'Bearer ' + token;
    let options = {
        method: 'POST',
        url: keys.reloadly_giftcard_base_url+`/orders`,
        data: data,
        headers: {
          'content-type': 'application/json',
          'Authorization': auth.replace("\n","")
        },
    };
    return new Promise(((resolve, reject) => {
        axios.request(options).then(async function (response) {
            resolve(response.data)
        }).catch(async function (error_response) {
            if(error_response.response.status === 401){
                if(await saveAuthorizationToken ("giftcard")){
                    token = await getReloadlyAccessToken("giftcard");
                    auth = 'Bearer ' + token;
                    options = {
                        method: 'POST',
                        url: keys.reloadly_giftcard_base_url+`/orders`,
                        data: data,
                        headers: {
                          'content-type': 'application/json',
                          'Authorization': auth.replace("\n","")
                        },
                    };
                    axios.request(options).then(async function (response) {
                        resolve(response.data)
                    })
                }
            } else {
                reject(error_response);
            }
        });
    }))
}

const orderTopuUp = async (data) => {
    let token = await getReloadlyAccessToken("airtime");
    let auth = 'Bearer ' + token;
    let options = {
        method: 'POST',
        url: keys.reloadly_airtime_base_url+`/topups`,
        data: data,
        headers: {
          'content-type': 'application/json',
          'Authorization': auth.replace("\n","")
        },
    };
    return new Promise(((resolve, reject) => {
        axios.request(options).then(async function (response) {
            resolve(response.data)
        }).catch(async function (error_response) {
            if(error_response.response.status === 401){
                if(await saveAuthorizationToken ("airtime")){
                    token = await getReloadlyAccessToken("airtime");
                    auth = 'Bearer ' + token;
                    options = {
                        method: 'POST',
                        url: keys.reloadly_airtime_base_url+`/topups`,
                        data: data,
                        headers: {
                          'content-type': 'application/json',
                          'Authorization': auth.replace("\n","")
                        },
                    };
                    axios.request(options).then(async function (response) {
                        resolve(response.data)
                    })
                }
            } else {
                reject(error_response);
            }
        });
    }))
}

const getGiftCardTransactionDetails = async (transaction_id) => {
    let token = await getReloadlyAccessToken();
    let auth = 'Bearer ' + token;
    let options = {
        method: 'GET',
        url: keys.reloadly_giftcard_base_url+`/reports/transactions/${transaction_id}`,
        headers: {
          'content-type': 'application/json',
          'Authorization': auth.replace("\n","")
        },
    };
    return new Promise(((resolve, reject) => {
        axios.request(options).then(async function (response) {
            resolve(response.data)
        }).catch(async function (error_response) {
            if(error_response.response.status === 401){
                const data = await saveAuthorizationToken ("giftcard")
                if(data){
                    token = await getReloadlyAccessToken("giftcard");
                    auth = 'Bearer ' + token;
                    options = {
                        method: 'GET',
                        url: keys.reloadly_giftcard_base_url+`/reports/transactions/${transaction_id}`,
                        headers: {
                        'content-type': 'application/json',
                        'Authorization': auth.replace("\n","")
                        },
                    };
                    axios.request(options).then(async function (response) {
                        resolve(response.data)
                    })
                }
            } else {
                reject(error_response);
            }
        });
    }))
};

const getTopUpTransactionDetails = async (transaction_id) => {
    let token = await getReloadlyAccessToken();
    let auth = 'Bearer ' + token;
    let options = {
        method: 'GET',
        url: keys.reloadly_giftcard_base_url+`/topups/reports/transactions/${transaction_id}`,
        headers: {
          'content-type': 'application/json',
          'Authorization': auth.replace("\n","")
        },
    };
    return new Promise(((resolve, reject) => {
        axios.request(options).then(async function (response) {
            resolve(response.data)
        }).catch(async function (error_response) {
            if(error_response.response.status === 401){
                const data = await saveAuthorizationToken ("giftcard")
                if(data){
                    token = await getReloadlyAccessToken("giftcard");
                    auth = 'Bearer ' + token;
                    options = {
                        method: 'GET',
                        url: keys.reloadly_giftcard_base_url+`/topups/reports/transactions/${transaction_id}`,
                        headers: {
                        'content-type': 'application/json',
                        'Authorization': auth.replace("\n","")
                        },
                    };
                    axios.request(options).then(async function (response) {
                        resolve(response.data)
                    })
                }
            } else {
                reject(error_response);
            }
        });
    }))
};


const getAllOperators = async () => {
    const operators = [];
    return new Promise((async (resolve, reject) => {
        fs.readFile(airtameOperators, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading the file:', err);
                reject(err);
            }
            try {
                const array = JSON.parse(data);
                array.forEach((item, index) => {
                    operators.push({
                        operator_id: item['operatorId'],
                        name: item['name'],
                        denomination_type: item['denominationType'],
                        sender_currency_code: item['senderCurrencyCode'],
                        sender_currency_symbol: item['senderCurrencySymbol'],
                        destination_currency_code: item['destinationCurrencyCode'],
                        destination_currency_symbol: item['destinationCurrencySymbol'],
                        commission: item['commission'],
                        international_discount: item['internationalDiscount'],
                        local_discount: item['localDiscount'],
                        logo: item['logoUrls'][item['logoUrls'].length-1]  
                    })
                    if(index == array.length-1){
                        resolve(operators);
                    }
                });
            } catch (parseErr) {
                reject(parseErr);
            }
        });
    }))
}

const getAllLocationsForOperator = async (operator_id) => {
    const states = [];
    return new Promise((async (resolve, reject) => {
        fs.readFile(airtameOperators, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading the file:', err);
                reject(err);
            }
            try {
                const array = JSON.parse(data);
                array.forEach((item, index) => {
                    if(operator_id == item['operatorId']) {
                        const rechargePlans = item['geographicalRechargePlans']
                        rechargePlans.forEach((plans, plansIndex) => {
                            states.push({
                                location_code: plans['locationCode'],
                                location_name: plans['locationName']
                            })
                            if(plansIndex == rechargePlans.length-1){
                                resolve(states);
                            }
                        })
                    }
                    if(index == array.length-1){
                        resolve(states);
                    }
                })
            } catch (parseErr) {
                reject(parseErr);
            }
        });
    }))
}

const createAllPlansFromOperatorId = async (operator_id, state) => {
    const plansData = []
    return new Promise((async (resolve, reject) => {
        fs.readFile(airtameOperators, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading the file:', err);
                reject(err);
            }
            try {
                const array = JSON.parse(data);
                array.forEach((item, index) => {
                    if(operator_id == item['operatorId']) {
                        const rechargePlans = item['geographicalRechargePlans']
                        rechargePlans.forEach((plans, plansIndex) => {
                            if(state == plans['locationCode']){
                                plansData.push({
                                    fixed_amounts: plans['fixedAmounts'],
                                    local_amounts: plans['localAmounts'],
                                    fixed_amounts_descriptions: plans['fixedAmountsDescriptions'],
                                    local_fixed_amounts_descriptions: plans['localFixedAmountsDescriptions'],
                                    local_fixed_amounts_plan_names: plans['localFixedAmountsPlanNames']
                                })
                                resolve(plansData)
                            }
                        })
                    }
                    if(index == array.length-1){
                        resolve(plansData);
                    }
                })
            } catch (parseErr) {
                reject(parseErr);
            }
        });
    }))
}

const getAllPlansFromOperatorId = async (operator_id, state) => {
    return new Promise((async (resolve, reject) => {
        try{
            const plans = await createAllPlansFromOperatorId(operator_id, state);
            const descriptions = plans[0].local_fixed_amounts_descriptions;
            const resultArray = [];
            for (const amount in descriptions) {
                resultArray.push({
                    amount: amount,
                    description:  descriptions[amount]
                })
            }
            resolve(resultArray);
        } catch(err){
            reject(err)
        }
    }))
}

const getCronServerIndiaAirtimeOperators = async (country_code) => {
    const apiUrl = "http://43.204.129.158:5000/api/v1.0/redemption/cron_server/wallet/topup/operators?country_code="+country_code;
    try {
      const response = await axios.get(apiUrl, {
        headers: {
          'x-api-key': process.env.API_KEY
        }
      });
  
      return response.data;
    } catch (error) {
      console.error("Error fetching India Airtime Operators:", error.response ? error.response.data : error.message);
      return error;
    }
  };

const getCronServerOperators = async () => {
    const apiUrl = "http://43.204.129.158:5000/api/v1.0/redemption/cron_server/operators";
    try {
        const response = await axios.get(apiUrl, {
        headers: {
            'x-api-key': process.env.API_KEY
        }
        });
        console.log(response)
        return response.data;
    } catch (error) {
        console.error("Error fetching India Airtime Operators:", error.response ? error.response.data : error.message);
        return error;
    }
};

const getCronServerOperatorLocations = async (operator_id) => {
    const apiUrl = "http://43.204.129.158:5000/api/v1.0/redemption/cron_server/operator_locations?operator_id="+operator_id;
    try {
        const response = await axios.get(apiUrl, {
        headers: {
            'x-api-key': process.env.API_KEY
        }
        });
        console.log(response)

        return response.data;
    } catch (error) {
        console.error("Error fetching India Airtime Operators:", error.response ? error.response.data : error.message);
        return error;
    }
};

const getCronServerOperatorByOperatorId = async (operator_id, state) => {
    const apiUrl = "http://43.204.129.158:5000/api/v1.0/redemption/cron_server/operator_by_operator_id?operator_id="+operator_id+"&state_code="+state;
    try {
        const response = await axios.get(apiUrl, {
        headers: {
            'x-api-key': process.env.API_KEY
        }
        });
        console.log(response)

        return response.data;
    } catch (error) {
        console.error("Error fetching India Airtime Operators:", error.response ? error.response.data : error.message);
        return error;
    }
};

module.exports = {
    saveAuthorizationToken ,
    getReloadlyAccessToken,
    getIndiaAirtimeOperators,
    getGiftCards,
    orderGiftCard,
    orderTopuUp,
    getGiftCardTransactionDetails,
    getTopUpTransactionDetails,
    getAllOperators,
    getAllLocationsForOperator,
    getAllPlansFromOperatorId,
    getCronServerIndiaAirtimeOperators,
    getCronServerOperators,
    getCronServerOperatorLocations,
    getCronServerOperatorByOperatorId
};
