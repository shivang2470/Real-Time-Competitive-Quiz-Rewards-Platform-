const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const battleSchema = new mongoose.Schema({
    category_id: {
        type: String,
        required: true
    },
    category_name: {
        type: String,
        required: true
    },
    category_image_url: {
        type: String,
        required: true
    },
    sub_category_id: {
        type: String,
        required: true
    },
    sub_category_name: {
        type: String,
        required: true
    },
    sub_category_image_url: {
        type: String,
        required: true
    },
    battle_name: {
        type: String,
        required: true
    },
    battle_id: {
        type: String,
        required: true
    },
    battle_image: {
        type: String,
        required: true
    },
    player1: {
        username: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        id: {
            type: String,
            required: true
        },
        avatar: {
            type: String,
            required: true
        },
        battle_file: {
            type: String,
            required: true
        },
        votes: { type: Number, default: 0 }
    },
    player2: {
        username: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        id: {
            type: String,
            required: true
        },
        avatar: {
            type: String,
            required: true
        },
        battle_file: {
            type: String,
            required: true
        },
        votes: { type: Number, default: 0 }
    },
    start_timestamp: {
        type: Number,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    end_timestamp: {
        type: Number,
        required: true
    },
    winner: {
        type: String,
        enum: ['player1', 'player2', 'tied', ""],
        default: ""
    },
    winner_reward_type: {
        type: String,
        required: true
    },
    winner_reward: { type: Number, default: 0 },
    entry_fee_type: {
        type: String,
        required: true
    },
    entry_fee: {
        type: Number,
        required: true
    },
    entry_fee_deducted: { type: Boolean, default: false },
    reported_count: {
        type: Number,
        default: 0
    }
});
const battleModel = mongoose.model('user_battles', battleSchema);

module.exports = battleModel;
