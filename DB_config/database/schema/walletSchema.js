const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        required: true
    },
    walletPrivate: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: 'paused'
    },
    volume_traded: {
        type: Number,
        default: 0
    },
    ticker: {
        type: Number,
        default: 0
    }
});

module.exports = walletSchema;
