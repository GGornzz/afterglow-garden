
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const path = require('path');

const { connectDB, getDB } = require('./db');
const authRoutes = require('./routes/authRoutes');
const decorRoutes = require('./routes/decorRoutes');
const shopRoutes = require('./routes/shopRoutes');
const questRoutes = require('./routes/questRoutes');
const gardenRoutes = require('./routes/gardenRoutes');
const habitRoutes = require('./routes/habitRoutes');
const statRoutes = require('./routes/statRoutes');
const app = express();

const PORT = Number(process.env.PORT) || 3000;
const MONGO_URL =
    process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';

const DB_NAME =
    process.env.DB_NAME || 'afterglow-garden-db';

app.disable('x-powered-by');

// จำกัด JSON request ไม่ให้มีขนาดใหญ่เกินไป
app.use(express.json({ limit: '20kb' }));

// ตรวจ Origin สำหรับการแก้ไขข้อมูลผ่าน API
app.use('/api', (req, res, next) => {
    const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    if (!methods.includes(req.method)) {
        return next();
    }

    const origin = req.get('origin');

    if (origin) {
        try {
            const originURL = new URL(origin);
            const hostURL = new URL(
                `${req.protocol}://${req.get('host')}`
            );

            if (originURL.origin !== hostURL.origin) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่อนุญาตคำขอจากเว็บไซต์อื่น'
                });
            }
        } catch {
            return res.status(403).json({
                success: false,
                message: 'Origin ไม่ถูกต้อง'
            });
        }
    }

    next();
});

async function startServer() {
    try {
        if (
            !process.env.SESSION_SECRET ||
            process.env.SESSION_SECRET.length < 32
        ) {
            throw new Error(
                'กรุณาตั้ง SESSION_SECRET อย่างน้อย 32 ตัวอักษรใน .env'
            );
        }

        await connectDB();

        // เก็บ Session ใน MongoDB
        const sessionStore = MongoStore.create({
            mongoUrl: MONGO_URL,
            dbName: DB_NAME,
            collectionName: 'sessions',
            ttl: 7 * 24 * 60 * 60
        });

        app.use(
            session({
                name: 'afterglow.sid',
                secret: process.env.SESSION_SECRET,
                resave: false,
                saveUninitialized: false,
                store: sessionStore,
                cookie: {
                    httpOnly: true,
                    secure: false, // เฉพาะ localhost ที่ใช้ HTTP
                    sameSite: 'lax',
                    maxAge: 7 * 24 * 60 * 60 * 1000
                }
            })
        );

        // API ตรวจสอบการเชื่อมต่อ
        app.get('/api/test', async (req, res) => {
            try {
                await getDB().command({ ping: 1 });

                res.json({
                    success: true,
                    message: 'AFTERGLOW GARDEN connected',
                    database: DB_NAME
                });
            } catch {
                res.status(500).json({
                    success: false,
                    message: 'Database connection failed'
                });
            }
        });

        // API สำหรับระบบสมาชิก
        app.use('/api/auth', authRoutes);
        app.use('/api/habits', habitRoutes);
        app.use('/api/garden', gardenRoutes);
        app.use('/api/quests', questRoutes);
        app.use('/api/shop', shopRoutes);
        app.use('/api/decor', decorRoutes);
        app.use('/api/statistics', statRoutes);
        // ป้องกันการแคชหน้า Dashboard
        app.get('/dashboard.html', (req, res) => {
            res.set('Cache-Control', 'no-store');

            res.sendFile(
                path.join(__dirname, '../public/dashboard.html')
            );
        });

        // เปิดใช้งาน Frontend
        app.use(
            express.static(
                path.join(__dirname, '../public')
            )
        );

        app.use('/api', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'API endpoint not found'
            });
        });

        app.listen(PORT, () => {
            console.log('');
            console.log('🌿 AFTERGLOW GARDEN');
            console.log(`✅ Server: http://localhost:${PORT}`);
            console.log(`✅ Database: ${DB_NAME}`);
            console.log('✅ Authentication API ready');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
}

startServer();
