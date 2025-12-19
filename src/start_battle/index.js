const fs = require("fs")
const { save_battle, deduct_fee } = require("./save_battle")
const deleting_file = require("../../websockets/delete_json")

const search_suitable_user = async (lookup) => {
    const matched_items = []
    let result = {}
    return new Promise((async (resolve, reject) => {
        fs.readFile("./websockets/connections.json", "utf8", async (err, connections) => {
            if (err) {
                console.log("File read failed:", err);
                return;
            }
            else {
                connections = JSON.parse(connections)
                const data = connections.connections
                if (data.length !== 0) {
                    for (i in data) {
                        if (!matched_items.includes(data[i])) {
                            const item = data.find(item2 => (
                                item2.battle_id === data[i].battle_id &&
                                item2.connection_id !== data[i].connection_id &&
                                item2.user_id !== data[i].user_id
                                //&& item2.gender === data[i].gender
                            ));
                            if (item) {
                                matched_items.push(data[i], item)
                                result = await save_battle(matched_items)
                                await deduct_fee(
                                    result.data._id,
                                    result.data.entry_fee,
                                    result.data.player1.id,
                                    result.data.player2.id,
                                    result.data.entry_fee_deducted
                                )
                                result.data.player1.connection_id = data[i].connection_id
                                result.data.player2.connection_id = item.connection_id
                                await deleting_file("./websockets/connections.json", result.data.player1.connection_id)
                                await deleting_file("./websockets/connections.json", result.data.player2.connection_id)
                                console.log("Connection Clossing....")
                                console.log(result.data.player1.connection_id)
                                await lookup[result.data.player1.connection_id].send(JSON.stringify(result));
                                await lookup[result.data.player2.connection_id].send(JSON.stringify(result));
                                await lookup[result.data.player1.connection_id].close()
                                console.log("Connection Clossing....")
                                console.log(result.data.player2.connection_id)
                                await lookup[result.data.player2.connection_id].close()
                                resolve(result)
                            }
                        }
                    }
                }
            }
        })
    }))
}

module.exports = search_suitable_user;
