const mongoose = require('mongoose');

const connectDb = async () => {
    const mongoURL = process.env.DB_URL;
    try {
        const conn = await mongoose.connect(mongoURL);
        console.log(`Mongo DB Connected: ${conn.connection.host}`);
    } catch(err) {
        console.log(err);
        process.exit(1);
    }
}

module.exports = connectDb;