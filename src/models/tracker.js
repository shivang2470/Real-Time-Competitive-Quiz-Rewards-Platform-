const gameWatchAdsModel = require('../db/modules/game_watch_ads')
const gameModel = require('../db/modules/games')
const quizLeaderboardWatchAdsModel = require('../db/modules/quiz_leaderboard_watch_ad')
const quizModel = require('../db/modules/quizzes')
const referralModel = require('../db/modules/referrals')
const watchAdsModel = require('../db/modules/watch_ads')

const addTrackerData = async (item) => {
    const new_data = new referralModel(item)
    return new Promise(((resolve, reject) => {
        try {
            new_data.save(async function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            })
        }
        catch (exec) {
            reject(exec)
        }
    }))
}

const addWatchAddTrackerData = async (item) => {
    const new_data = new watchAdsModel(item)
    return new Promise(((resolve, reject) => {
        try {
            new_data.save(async function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            })
        }
        catch (exec) {
            reject(exec)
        }
    }))
}

const quizTrackerData = async (item) => {
    const new_data = new quizModel(item)
    return new Promise(((resolve, reject) => {
        try {
            new_data.save(async function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            })
        }
        catch (exec) {
            reject(exec)
        }
    }))
}

const getWatchAddTrackerData = async (id) => {
    const data = watchAdsModel.findOne({ _id: id })
    return new Promise(((resolve, reject) => {
        try {
            data.exec(async function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            })
        }
        catch (exec) {
            reject(exec)
        }
    }))
}

const updateWatchAddTrackerDataTrue = async (id) => {
    const data = watchAdsModel.updateOne({ _id: id }, { $set: { ad_watched: true } })
    return new Promise(((resolve, reject) => {
        try {
            data.exec(async function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            })
        }
        catch (exec) {
            reject(exec)
        }
    }))
}

const addGamesTrackerData = async (item) => {
    const new_data = new gameModel(item)
    return new Promise(((resolve, reject) => {
        try {
            new_data.save(async function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            })
        }
        catch (exec) {
            reject(exec)
        }
    }))
}

const addGameWatchAddTrackerData = async (item) => {
    const new_data = new gameWatchAdsModel(item)
    return new Promise(((resolve, reject) => {
        try {
            new_data.save(async function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            })
        }
        catch (exec) {
            reject(exec)
        }
    }))
}

const getGameWatchAddTrackerData = async (id) => {
    const data = gameWatchAdsModel.findOne({ _id: id })
    return new Promise(((resolve, reject) => {
        try {
            data.exec(async function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            })
        }
        catch (exec) {
            reject(exec)
        }
    }))
}

const updateGameWatchAddTrackerDataTrue = async (id) => {
    const data = gameWatchAdsModel.updateOne({ _id: id }, { $set: { ad_watched: true } })
    return new Promise(((resolve, reject) => {
        try {
            data.exec(async function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            })
        }
        catch (exec) {
            reject(exec)
        }
    }))
}

const getQuizLeaderboardWatchAddTrackerData = async (id) => {
    const data = quizLeaderboardWatchAdsModel.findOne({ _id: id })
    return new Promise(((resolve, reject) => {
        try {
            data.exec(async function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            })
        }
        catch (exec) {
            reject(exec)
        }
    }))
}

const addQuizLeaderboardWatchAddTrackerData = async (item) => {
    const new_data = new quizLeaderboardWatchAdsModel(item)
    return new Promise(((resolve, reject) => {
        try {
            new_data.save(async function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            })
        }
        catch (exec) {
            reject(exec)
        }
    }))
}

const updatequizLeaderboardWatchAddTrackerDataTrue = async (id) => {
    const data = quizLeaderboardWatchAdsModel.updateOne({ _id: id }, { $set: { ad_watched: true } })
    return new Promise(((resolve, reject) => {
        try {
            data.exec(async function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            })
        }
        catch (exec) {
            reject(exec)
        }
    }))
}

module.exports = {
    addTrackerData, addWatchAddTrackerData, quizTrackerData, getWatchAddTrackerData,
    updateWatchAddTrackerDataTrue, addGamesTrackerData, addGameWatchAddTrackerData, getGameWatchAddTrackerData,
    updateGameWatchAddTrackerDataTrue, addQuizLeaderboardWatchAddTrackerData, updatequizLeaderboardWatchAddTrackerDataTrue, getQuizLeaderboardWatchAddTrackerData
}