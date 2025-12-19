const getLeague = (total_coins) => {
    if (parseInt(total_coins) < 200) {
        return "Bronze I"
    }
    else if (parseInt(total_coins) >= 200 && parseInt(total_coins) < 300) {
        return "Bronze II"
    }
    else if (parseInt(total_coins) >= 300 && parseInt(total_coins) < 400) {
        return "Bronze III"
    }
    else if (parseInt(total_coins) >= 400 && parseInt(total_coins) < 600) {
        return "Silver I"
    }
    else if (parseInt(total_coins) >= 600 && parseInt(total_coins) < 800) {
        return "Silver II"
    }
    else if (parseInt(total_coins) >= 800 && parseInt(total_coins) < 1000) {
        return "Silver III"
    }
    else if (parseInt(total_coins) >= 1000 && parseInt(total_coins) < 1300) {
        return "Gold I"
    }
    else if (parseInt(total_coins) >= 1300 && parseInt(total_coins) < 1600) {
        return "Gold II"
    }
    else if (parseInt(total_coins) >= 1600 && parseInt(total_coins) < 2000) {
        return "Gold III"
    }
    else if (parseInt(total_coins) >= 2000 && parseInt(total_coins) < 2500) {
        return "Gold Master I"
    }
    else if (parseInt(total_coins) >= 2500 && parseInt(total_coins) < 3200) {
        return "Gold Master II"
    }
    else if (parseInt(total_coins) >= 3200 && parseInt(total_coins) < 4000) {
        return "Gold Mater III"
    }
    else if (parseInt(total_coins) >= 4000 && parseInt(total_coins) < 5500) {
        return "Diamond I"
    }
    else if (parseInt(total_coins) >= 5500 && parseInt(total_coins) < 7500) {
        return "Diamond II"
    }
    else if (parseInt(total_coins) >= 7500 && parseInt(total_coins) < 10000) {
        return "Diamond III"
    }
    else if (parseInt(total_coins) >= 10000) {
        return "Titan"
    }
}

module.exports = { getLeague }