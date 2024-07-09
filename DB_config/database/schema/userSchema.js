const mongoose = require('mongoose');
const walletSchema = require('./walletSchema');

const userSchema = new mongoose.Schema({
    userId: {
        type: Number,
        required: true,
        unique: true
    },
    wallets: {
        type: [walletSchema],
        default: []
    },
    settings: {
        tokenAddress: {
            type: String,
            default: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" // USDT
        },
        buySlippage: {
            type: Number,
            default: 30
        },
        sellSlippage: {
            type: Number,
            default: 30
        }
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
