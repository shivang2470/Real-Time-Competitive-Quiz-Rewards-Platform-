const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const key = require('../../config/keys');
const { response } = require("../models/response");
const walletModel = require('../db/modules/wallet');
const walletStatementsModel = require('../db/modules/wallet_statements');
const orderModel = require('../db/modules/orders');
const externalTransfersModel = require('../db/modules/external_transfers');
const {redis, deleteKeysByPrefix} = require('./redis');

AWS.config.update({
    region: key.region,
    accessKeyId: key.AWS_ACCESS_KEY,
    secretAccessKey: key.AWS_SECRET_ACCESS_KEY
});

const table = key.tableRedemption;

const docClient = new AWS.DynamoDB.DocumentClient();

const getRedemption = async () => {
    const params = {
        TableName: table,
        KeyConditionExpression: '#type = :hkey',
        ExpressionAttributeNames: { '#type': 'type' },
        ExpressionAttributeValues: { ':hkey': 'redemption' },
    };

    return new Promise(((resolve, reject) => {
        try{
            docClient.query(params, async function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    if(data.Items.length > 0){
                        resolve(data.Items[0])
                    }
                    else{
                        resolve([])
                    }
                }
            });
        }
        catch(exec){
            reject(exec)
        }
    }));
};

const updateRedemptionRequestCounts = async (value) => {
    const params = {
        TableName: table,
        Key: { "type": "redemption", "id": key.redemption_id },
        UpdateExpression: `set total_redemption_request = total_redemption_request + :value`,
        ExpressionAttributeValues: { ":value": value }
    };
    return new Promise(((resolve, reject) => {
        try{
            docClient.update(params, function(err, data) {
                if (err) reject(err);
                else resolve(data);
            });
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const updateRedemptionApprovedCounts = async (value) => {
    const params = {
        TableName: table,
        Key: { "type": "redemption", "id": key.redemption_id },
        UpdateExpression: `set total_approved_request = total_approved_request + :value`,
        ExpressionAttributeValues: { ":value": value }
    };
    return new Promise(((resolve, reject) => {
        try{
            docClient.update(params, function(err, data) {
                if (err) reject(err);
                else resolve(data);
            });
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const updateRedemptionTotalMoneyInvestedCounts = async (value) => {
    const params = {
        TableName: table,
        Key: { "type": "redemption", "id": key.redemption_id },
        UpdateExpression: `set total_money_invested = total_money_invested + :value`,
        ExpressionAttributeValues: { ":value": value }
    };
    return new Promise(((resolve, reject) => {
        try{
            docClient.update(params, function(err, data) {
                if (err) reject(err);
                else resolve(data);
            });
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const getTransactions = async (user_id, page, limit) => {
    const params = {
        TableName: table,
        IndexName: "uuid-timestamp-index",
        KeyConditionExpression: '#type = :hkey',
        ExpressionAttributeNames: { '#type': 'uuid', '#status': 'status', '#timestamp': 'timestamp'},
        ExpressionAttributeValues: { ':hkey': user_id },
        ScanIndexForward: false,
        ProjectionExpression: 'amount_to_redeem, #status, #timestamp, coins_to_redeem, payment_mode, payment_mode_value',
        Limit: limit?limit:8
    };
    if (page && page.includes("#")) {
        const pageKey = page.split("#")
        params.ExclusiveStartKey = {
            uuid: pageKey[0],
            id: pageKey[1],
            timestamp: parseInt(pageKey[2]),
            type: "redemption_request"
        }
    }
    return new Promise(((resolve, reject) => {
        try{
            docClient.query(params, async function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    const dataToResolve = {data: data.Items}
                    if ('LastEvaluatedKey' in data && 'id' in data.LastEvaluatedKey && 'uuid' in data.LastEvaluatedKey && 'timestamp' in data.LastEvaluatedKey && 'type' in data.LastEvaluatedKey) {
                        dataToResolve.nextPage = `${data.LastEvaluatedKey.uuid}#${data.LastEvaluatedKey.id}#${data.LastEvaluatedKey.timestamp}#${data.LastEvaluatedKey.type}`;
                    }
                    resolve(dataToResolve)
                }
            });
        }
        catch(exc) {
            reject(exc)
        }
    }));
};

const insertRedemptionRequest = async (user_id, coins_to_redeem, redemption_option, payment_mode, payment_mode_value, reward) => {
    const id = uuidv4() 
    const params = {
        TableName: table,
        Item: {
            "id": id,
            "type": "redemption_request",
            "uuid": user_id,
            "status": payment_mode=="DIGITAL"?"Completed":"Requested",
            "coins_to_redeem": coins_to_redeem,
            "amount_to_redeem": reward,
            "redemption_option": redemption_option,
            "payment_mode": payment_mode,
            "payment_mode_value": payment_mode_value,
            "timestamp": +new Date()
        },
    };
    return new Promise(((resolve, reject) => {
        try{
            docClient.put(params, async function (err, data) {
                if (err) {
                    reject(err)
                } else {
                    if(payment_mode!="DIGITAL"){
                        await updateRedemptionRequestCounts(1).catch(async error => {
                            reject(error);
                        })
                    }
                    resolve(id)
                }
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
};

const getRedemptionDetails = async (id) => {
    const params = {
        TableName: table,
        KeyConditionExpression: '#type = :hkey and #id = :hkey2',
        ExpressionAttributeNames: { '#type': 'type', '#id': 'id', '#status': 'status', '#timestamp': 'timestamp' },
        ExpressionAttributeValues: { ':hkey': 'redemption_request', ':hkey2': id },
        ProjectionExpression: 'amount_to_redeem,coins_to_redeem,payment_mode_value,#status,#timestamp,redemption_option, payment_mode',
    }
    return new Promise(((resolve, reject) => {
        try{
            docClient.query(params, async function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data.Items[0])
                }
            });
        }
        catch(exec){
            reject(exec)
        }
    }));
};

const getLastTransactionId = async () => {
    let statementData = await walletStatementsModel.find({}).sort({created_at:-1}).limit(1);
    if(statementData.length){
        return statementData[0].transaction_id.split("ttid")[1];
    } else {
        return 0;
    }
}

const getWalletBalance = async (user_id) => {
    let walletData = await walletModel.findOne({user_id: user_id}).exec();
    if(walletData){
        return walletData.balance;
    } else {
        await new walletModel({
            user_id: user_id,
            balance: 0.0,
            created_at: +new Date(),
            updated_at: +new Date()
        }).save()
        return 0.0;
    }
}

const getWalletId = async (user_id) => {
    let walletData = await walletModel.findOne({user_id: user_id}).exec();
    return walletData._id;
}

const updateWalletBalance = async (user_id, currentBalance, reward) => {
    currentBalance = parseFloat(currentBalance)
    reward = parseFloat(reward)
    await walletModel.updateOne({user_id: user_id}, {balance: parseFloat(currentBalance + reward).toFixed(2), updated_at: +new Date()}).exec();
    const data_from_cache = await redis.get(`wallet:${user_id}`);
    if(data_from_cache) await redis.del(`wallet:${user_id}`)
    return parseFloat(currentBalance + reward).toFixed(2);
}

const insertWalletStatements = async (user_id, payment_type, balance, reward, payment_purpose="", payment_mode, ref_id, transaction_id) => {
    const item = {
        user_id: user_id,
        balance: parseFloat(balance).toFixed(2),
        transaction_id: transaction_id,
        payment_purpose: payment_purpose,
        payment_type: payment_type,
        created_at: +new Date(),
        updated_at: +new Date()
    }
    if(payment_type == "DR"){
        item['debit'] = reward
    } else if(payment_type == "CR"){
        item['credit'] = reward
    }
    if(payment_mode){
        item['payment_mode'] = payment_mode
    }
    if(ref_id){
        item['ref_id'] = ref_id
    }
    const wallet_statements_id = (await new walletStatementsModel(item).save())._id;
    await deleteKeysByPrefix(`wallet_statements:${user_id}`)
    return {
        transaction_id,
        wallet_statements_id
    }
}

const getWalletStatements = async (user_id, limit, page, order_by) => {
    let sort_param = 1;
    if(order_by === "desc"){
        sort_param = -1
    }
    let walletStatements = await walletStatementsModel.find({user_id: user_id}).sort({"created_at": sort_param}).limit(parseInt(limit)).skip((parseInt((page) - 1)*(parseInt(limit))));
    return walletStatements;
}

const insertGiftCardOrders = async (wallet_statements_id, user_id, paymentData, transaction_id, payment_purpose, payment_mode) => {
    const item = {
        wallet_statements_id: wallet_statements_id,
        ref_id: paymentData.transactionId,
        transaction_id: transaction_id,
        user_id: user_id,
        product_price: paymentData.product.currencyCode=="USD"?parseFloat(parseFloat(paymentData.product.totalPrice).toFixed(2) * parseFloat(paymentData.fee).toFixed(2)).toFixed(2):parseFloat(paymentData.product.totalPrice).toFixed(2),
        amount: paymentData.product.currencyCode=="USD"?parseFloat(parseFloat(paymentData.product.totalPrice).toFixed(2) * parseFloat(paymentData.fee).toFixed(2)).toFixed(2):parseFloat(paymentData.product.totalPrice).toFixed(2),
        transaction_id: transaction_id,
        payment_mode: payment_mode,
        payment_purpose: payment_purpose,
        email_id: paymentData.recipientEmail,
        mobile_number: paymentData.recipientPhone,
        custom_identifier: paymentData.customIdentifier,
        product_id: paymentData.product.productId,
        product_name: paymentData.product.productName,
        status: paymentData.status,
        meta_data: paymentData,
        created_at: +new Date(),
        updated_at: +new Date()
    }
    const order_id = (await new orderModel(item).save())._id;
    await deleteKeysByPrefix(`wallet_orders:${user_id}`)
    return order_id;
}

const insertTopUpOrders = async (wallet_statements_id, user_id, paymentData, transaction_id, payment_purpose, payment_mode) => {
    const item = {
        wallet_statements_id: wallet_statements_id,
        ref_id: paymentData.transactionId,
        transaction_id: transaction_id,
        user_id: user_id,
        product_price: parseFloat(paymentData.deliveredAmount),
        amount: parseFloat(paymentData.balanceInfo.cost).toFixed(2),
        transaction_id: transaction_id,
        payment_mode: payment_mode,
        payment_purpose: payment_purpose,
        email_id: paymentData.recipientEmail,
        mobile_number: paymentData.recipientPhone,
        custom_identifier: paymentData.customIdentifier,
        product_id: paymentData.operatorId,
        product_name: paymentData.operatorName,
        status: paymentData.status,
        meta_data: paymentData,
        created_at: +new Date(),
        updated_at: +new Date()
    }
    const order_id = (await new orderModel(item).save())._id;
    await deleteKeysByPrefix(`wallet_orders:${user_id}`)
    return order_id;
}

const responseTopUpData = async (data) => {
    return {
        transactionId: data.transactionId,
        status: data.status,
        customIdentifier: data.customIdentifier,
        recipientPhone: data.recipientPhone,
        recipientEmail: data.recipientEmail,
        countryCode: data.countryCode,
        operatorId: data.operatorId,
        operatorName: data.operatorName,
        requestedAmount: data.requestedAmount,
        requestedAmountCurrencyCode: data.requestedAmountCurrencyCode,
        deliveredAmount: data.deliveredAmount,
        deliveredAmountCurrencyCode: data.deliveredAmountCurrencyCode,
    }
}

const getWalletOrders = async (user_id, limit, page, order_by) => {
    let sort_param = 1;
    if(order_by === "desc"){
        sort_param = -1
    }
    let orders = await orderModel.find({user_id: user_id}).sort({"created_at": sort_param}).limit(parseInt(limit)).skip((parseInt((page) - 1)*(parseInt(limit))));
    return orders;
}

const responseOrderData = async (data) => {
    const result = [];
    for(let i = 0; i < data.length; i++) {
        result.push({
            order_id: data[i]._id,
            transaction_id: data[i].transaction_id,
            ref_id: data[i].ref_id,
            status: data[i].status,
            custom_identifier: data[i].custom_identifier,
            recipient_phone: data[i].email_id,
            recipient_email: data[i].mobile_number,
            product_id: data[i].product_id,
            product_name: data[i].product_name,
            product_price: data[i].product_price,
            currency_code: data[i].meta_data?data[i].meta_data.deliveredAmountCurrencyCode:"",
            payment_purpose: data[i].payment_purpose,
            created_at: data[i].created_at
        })
    }
    return result;
}

const insertExternalTransfers = async (user_id, product_id) => {
    const transaction_id = "ttid"+ (parseInt(await getLastTransactionId()) + 1);
    const item = {
        transaction_id: transaction_id,
        user_id: user_id,
        product_id: product_id,
        created_at: +new Date(),
        updated_at: +new Date()
    }
    const external_transfers_id = (await new externalTransfersModel(item).save())._id;
    return {
        transaction_id,
        external_transfers_id
    };
}

const updateExternalTransfers = async (external_transfers_id, ref_id, order_id, status) => {
    await externalTransfersModel.updateOne({_id: external_transfers_id}, {
        ref_id: ref_id,
        order_id: order_id,
        status: status
    });
    return "Updated"
}

const transactionAllowed = async (user_id) => {
    const last_transaction_details = await externalTransfersModel.findOne({user_id: user_id}).sort({ "created_at": -1 }).limit(1).exec();
    if(last_transaction_details){
        // Substract last_transaction_details created_at from curremt timestamp
        const currentTime = new Date();
        const lastTransactionTime = new Date(last_transaction_details.created_at);
        const timeDifference = currentTime - lastTransactionTime;
        const timeThreshold = 10 * 60 * 1000;
        if (timeDifference < timeThreshold) {
            // If the time difference is less than the threshold, return false
            return false;
        } else {
            // Otherwise, transaction is allowed
            return true;
        }
    } else {
        return true;
    }
}

module.exports = {
    getRedemption, insertRedemptionRequest, getTransactions, getRedemptionDetails, updateRedemptionRequestCounts, getWalletBalance, 
    updateWalletBalance, insertWalletStatements, getWalletId, updateRedemptionApprovedCounts, updateRedemptionTotalMoneyInvestedCounts,
    getWalletStatements, insertGiftCardOrders, insertTopUpOrders, responseTopUpData, getWalletOrders, responseOrderData, insertExternalTransfers,
    updateExternalTransfers, transactionAllowed, getLastTransactionId
}