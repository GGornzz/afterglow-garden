
const { MongoClient } = require('mongodb');

const MONGO_URL =
    process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';

const DB_NAME =
    process.env.DB_NAME || 'afterglow-garden-db';

const client = new MongoClient(MONGO_URL);

let db = null;

async function connectDB() {
    await client.connect();

    db = client.db(DB_NAME);

    await db.command({ ping: 1 });

    console.log(`✅ Connected to MongoDB: ${DB_NAME}`);

    // ห้ามสมาชิกใช้อีเมลซ้ำ
    await db.collection('users').createIndex(
        { email: 1 },
        { unique: true }
    );

    console.log('✅ User email unique index ready');
    await db.collection('habitLogs').createIndex(
        { habitId: 1, logDate: 1 },
        { unique: true }
    );

    console.log('✅ Habit completion index ready');
    await db.collection('gardenPlants').createIndex(
        { userId: 1, habitId: 1 },
        { unique: true }
    );

    console.log('✅ Garden plants index ready');
    return db;
}

function getDB() {
    if (!db) {
        throw new Error('Database has not connected yet');
    }

    return db;
}

module.exports = {
    connectDB,
    getDB
};
