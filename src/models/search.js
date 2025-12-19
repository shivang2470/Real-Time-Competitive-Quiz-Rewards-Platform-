let battleModel = require("../db/modules/user_battles")

const search_live_battle = async (username, page, limit) => {
    const filter = {
        $or: [
            { "player1.username": new RegExp(`${username}`, 'i') },
            { "player2.username": new RegExp(`${username}`, 'i') }
        ],
        end_timestamp: { $gte: new Date().getTime() }
    }
    return new Promise((async (resolve, reject) => {
        try{
            const live_battles = []
            if(!limit || !page){
                limit = 25
            }
            battleModel.find(filter, {"player1.username": 1, "player2.username": 1}).limit(limit)
                .skip(((page - 1) * limit))
                .sort({ start_timestamp: -1 })
                .exec().then(async (data) => {
                    if(data.length === 0){
                        resolve(live_battles)
                    }
                    data.map(async (item, index) => {
                        live_battles.push({
                            "text": item.player1.username + " vs " + item.player2.username,
                            "id": item._id
                        })
                        if(live_battles.length === data.length){
                            resolve(live_battles)
                        }
                    })
                })
            }
        catch(exec){
            reject(exec)
        }
    }))
}

module.exports = { search_live_battle }