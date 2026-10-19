
const express = require('express');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

function publicUser(user) {
    return {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        level: user.level,
        xp: user.xp,
        coins: user.coins,
        createdAt: user.createdAt
    };
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ==============================
// REGISTER
// POST /api/auth/register
// ==============================

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body || {};

        if (
            typeof username !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string'
        ) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบ'
            });
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanUsername.length < 3 || cleanUsername.length > 40) {
            return res.status(400).json({
                success: false,
                message: 'ชื่อผู้ใช้ต้องมีความยาว 3–40 ตัวอักษร'
            });
        }

        if (
            cleanEmail.length > 254 ||
            !isValidEmail(cleanEmail)
        ) {
            return res.status(400).json({
                success: false,
                message: 'รูปแบบอีเมลไม่ถูกต้อง'
            });
        }

        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({
                success: false,
                message: 'รหัสผ่านต้องมีความยาว 8–72 ตัวอักษร'
            });
        }

        const db = getDB();

        const existingUser = await db.collection('users').findOne({
            email: cleanEmail
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'อีเมลนี้ถูกใช้งานแล้ว'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const newUser = {
            username: cleanUsername,
            email: cleanEmail,
            passwordHash,
            level: 1,
            xp: 0,
            coins: 0,
            createdAt: new Date()
        };

        const result = await db
            .collection('users')
            .insertOne(newUser);

        return res.status(201).json({
            success: true,
            message: 'สมัครสมาชิกสำเร็จ',
            user: publicUser({
                ...newUser,
                _id: result.insertedId
            })
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'อีเมลนี้ถูกใช้งานแล้ว'
            });
        }

        console.error('Register error:', error);

        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก'
        });
    }
});

// ==============================
// LOGIN
// POST /api/auth/login
// ==============================

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== 'string' ||
            typeof password !== 'string'
        ) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกอีเมลและรหัสผ่าน'
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const db = getDB();

        const user = await db.collection('users').findOne({
            email: cleanEmail
        });

        const validPassword = user
            ? await bcrypt.compare(password, user.passwordHash)
            : false;

        if (!user || !validPassword) {
            return res.status(401).json({
                success: false,
                message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        // สร้าง Session ID ใหม่หลัง Login
        req.session.regenerate((error) => {
            if (error) {
                console.error('Session regenerate error:', error);

                return res.status(500).json({
                    success: false,
                    message: 'ไม่สามารถเข้าสู่ระบบได้'
                });
            }

            req.session.userId = user._id.toString();

            req.session.save((saveError) => {
                if (saveError) {
                    console.error('Session save error:', saveError);

                    return res.status(500).json({
                        success: false,
                        message: 'ไม่สามารถบันทึก Session ได้'
                    });
                }

                return res.json({
                    success: true,
                    message: 'เข้าสู่ระบบสำเร็จ',
                    user: publicUser(user)
                });
            });
        });
    } catch (error) {
        console.error('Login error:', error);

        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
        });
    }
});

// ==============================
// CURRENT USER
// GET /api/auth/me
// ==============================

router.get('/me', requireAuth, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.session.userId)) {
            return res.status(401).json({
                success: false,
                message: 'Session ไม่ถูกต้อง'
            });
        }

        const db = getDB();

        const user = await db.collection('users').findOne({
            _id: new ObjectId(req.session.userId)
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'ไม่พบบัญชีผู้ใช้'
            });
        }

        return res.json({
            success: true,
            user: publicUser(user)
        });
    } catch (error) {
        console.error('Get user error:', error);

        return res.status(500).json({
            success: false,
            message: 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้'
        });
    }
});

// ==============================
// LOGOUT
// POST /api/auth/logout
// ==============================

router.post('/logout', requireAuth, (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error('Logout error:', error);

            return res.status(500).json({
                success: false,
                message: 'ออกจากระบบไม่สำเร็จ'
            });
        }

        res.clearCookie('afterglow.sid');

        return res.json({
            success: true,
            message: 'ออกจากระบบสำเร็จ'
        });
    });
});

module.exports = router;
