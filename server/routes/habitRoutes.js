
const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');
const {
    requireAuth
} = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);

const REWARD_XP = 20;
const REWARD_COINS = 10;

const CATEGORIES = [
    'Education',
    'Health',
    'Productivity',
    'Creativity',
    'Personal'
];

function currentUserId(req) {
    return new ObjectId(req.session.userId);
}

function validId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
}

// ใช้วันที่ตามเวลาไทย ไม่ขึ้นกับ Timezone เครื่อง
function todayKey() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(new Date());

    const get = (type) =>
        parts.find(part => part.type === type).value;

    return `${get('year')}-${get('month')}-${get('day')}`;
}

function validateHabit(data) {
    const title =
        typeof data.title === 'string'
            ? data.title.trim()
            : '';

    const description =
        typeof data.description === 'string'
            ? data.description.trim()
            : '';

    if (title.length < 3 || title.length > 100) {
        return {
            error: 'ชื่อเป้าหมายต้องมีความยาว 3–100 ตัวอักษร'
        };
    }

    if (description.length > 500) {
        return {
            error: 'รายละเอียดต้องไม่เกิน 500 ตัวอักษร'
        };
    }

    if (!CATEGORIES.includes(data.category)) {
        return {
            error: 'หมวดหมู่ไม่ถูกต้อง'
        };
    }

    return {
        value: {
            title,
            description,
            category: data.category,
            frequency: 'daily'
        }
    };
}

// ====================================
// GET ALL HABITS + COMPLETION STATUS
// ====================================

router.get('/', async (req, res) => {
    try {
        const db = getDB();
        const userId = currentUserId(req);
        const today = todayKey();

        const habits = await db.collection('habits')
            .find({ userId })
            .sort({ createdAt: -1 })
            .toArray();

        const logs = await db.collection('habitLogs')
            .find({
                userId,
                logDate: today
            })
            .project({ habitId: 1 })
            .toArray();

        const completedIds = new Set(
            logs.map(log => log.habitId.toString())
        );

        const result = habits.map(habit => ({
            ...habit,
            completedToday: completedIds.has(
                habit._id.toString()
            )
        }));

        res.json({
            success: true,
            date: today,
            habits: result
        });
    } catch (error) {
        console.error('Get habits error:', error);

        res.status(500).json({
            success: false,
            message: 'โหลดข้อมูลเป้าหมายไม่สำเร็จ'
        });
    }
});

// ====================================
// CREATE HABIT
// ====================================

router.post('/', async (req, res) => {
    try {
        const checked = validateHabit(req.body || {});

        if (checked.error) {
            return res.status(400).json({
                success: false,
                message: checked.error
            });
        }

        const habit = {
            userId: currentUserId(req),
            ...checked.value,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await getDB()
            .collection('habits')
            .insertOne(habit);

        res.status(201).json({
            success: true,
            message: 'เพิ่มเป้าหมายสำเร็จ',
            habit: {
                ...habit,
                _id: result.insertedId
            }
        });
    } catch (error) {
        console.error('Create habit error:', error);

        res.status(500).json({
            success: false,
            message: 'เพิ่มเป้าหมายไม่สำเร็จ'
        });
    }
});

// ====================================
// COMPLETE TODAY
// POST /api/habits/:id/complete
// ====================================

router.post('/:id/complete', async (req, res) => {
    try {
        if (!validId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'รหัสเป้าหมายไม่ถูกต้อง'
            });
        }

        const db = getDB();
        const userId = currentUserId(req);
        const habitId = new ObjectId(req.params.id);

        const habit = await db.collection('habits')
            .findOne({
                _id: habitId,
                userId
            });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบเป้าหมายนี้'
            });
        }

        if (!habit.isActive) {
            return res.status(400).json({
                success: false,
                message: 'ต้องเปิดใช้งานเป้าหมายก่อน'
            });
        }

        const today = todayKey();

        const log = {
            userId,
            habitId,
            logDate: today,
            status: 'completed',
            earnedXP: REWARD_XP,
            earnedCoins: REWARD_COINS,
            rewardApplied: false,
            completedAt: new Date()
        };

        // Unique Index ป้องกันการ Complete ซ้ำ
        let insertResult;

        try {
            insertResult = await db.collection('habitLogs')
                .insertOne(log);
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message: 'วันนี้คุณทำเป้าหมายนี้สำเร็จแล้ว 🌷'
                });
            }

            throw error;
        }

        // เพิ่มรางวัลให้ผู้ใช้
        // ขั้นนี้ยังไม่ได้ใช้ MongoDB Transaction
        const updateResult = await db.collection('users')
            .updateOne(
                { _id: userId },
                {
                    $inc: {
                        xp: REWARD_XP,
                        coins: REWARD_COINS
                    }
                }
            );

        if (updateResult.matchedCount !== 1) {
            throw new Error('User not found during reward update');
        }

        // บันทึกว่าจ่ายรางวัลแล้ว
        await db.collection('habitLogs').updateOne(
            { _id: insertResult.insertedId },
            { $set: { rewardApplied: true } }
        );

        const user = await db.collection('users')
            .findOne({ _id: userId });

        const level = Math.floor(user.xp / 100) + 1;

        if (user.level !== level) {
            await db.collection('users').updateOne(
                { _id: userId },
                { $set: { level } }
            );
        }

        res.json({
            success: true,
            message: 'ทำเป้าหมายสำเร็จ! 🌱',
            reward: {
                xp: REWARD_XP,
                coins: REWARD_COINS
            },
            user: {
                level,
                xp: user.xp,
                coins: user.coins
            },
            completedToday: true
        });
    } catch (error) {
        console.error('Complete habit error:', error);

        res.status(500).json({
            success: false,
            message: 'ไม่สามารถบันทึกความสำเร็จได้ กรุณาตรวจสอบสถานะก่อนลองใหม่'
        });
    }
});

// ====================================
// GET COMPLETION HISTORY
// GET /api/habits/history
// ====================================

router.get('/history', async (req, res) => {
    try {
        const logs = await getDB()
            .collection('habitLogs')
            .find({
                userId: currentUserId(req)
            })
            .sort({ completedAt: -1 })
            .limit(100)
            .toArray();

        res.json({
            success: true,
            logs
        });
    } catch (error) {
        console.error('Habit history error:', error);

        res.status(500).json({
            success: false,
            message: 'โหลดประวัติไม่สำเร็จ'
        });
    }
});

// ====================================
// UPDATE HABIT
// ====================================

router.put('/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'รหัสเป้าหมายไม่ถูกต้อง'
            });
        }

        const checked = validateHabit(req.body || {});

        if (checked.error) {
            return res.status(400).json({
                success: false,
                message: checked.error
            });
        }

        const result = await getDB()
            .collection('habits')
            .updateOne(
                {
                    _id: new ObjectId(req.params.id),
                    userId: currentUserId(req)
                },
                {
                    $set: {
                        ...checked.value,
                        updatedAt: new Date()
                    }
                }
            );

        if (!result.matchedCount) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบเป้าหมายนี้'
            });
        }

        res.json({
            success: true,
            message: 'แก้ไขเป้าหมายสำเร็จ'
        });
    } catch (error) {
        console.error('Update habit error:', error);

        res.status(500).json({
            success: false,
            message: 'แก้ไขเป้าหมายไม่สำเร็จ'
        });
    }
});

// ====================================
// PAUSE / ACTIVATE
// ====================================

router.patch('/:id/status', async (req, res) => {
    try {
        if (!validId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'รหัสเป้าหมายไม่ถูกต้อง'
            });
        }

        if (typeof req.body?.isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'สถานะไม่ถูกต้อง'
            });
        }

        const result = await getDB()
            .collection('habits')
            .updateOne(
                {
                    _id: new ObjectId(req.params.id),
                    userId: currentUserId(req)
                },
                {
                    $set: {
                        isActive: req.body.isActive,
                        updatedAt: new Date()
                    }
                }
            );

        if (!result.matchedCount) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบเป้าหมายนี้'
            });
        }

        res.json({
            success: true,
            message: 'เปลี่ยนสถานะสำเร็จ'
        });
    } catch (error) {
        console.error('Habit status error:', error);

        res.status(500).json({
            success: false,
            message: 'เปลี่ยนสถานะไม่สำเร็จ'
        });
    }
});

// ====================================
// DELETE HABIT
// ตอนนี้ใช้การปิดใช้งานเพื่อเก็บประวัติ
// ====================================

router.delete('/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'รหัสเป้าหมายไม่ถูกต้อง'
            });
        }

        const result = await getDB()
            .collection('habits')
            .updateOne(
                {
                    _id: new ObjectId(req.params.id),
                    userId: currentUserId(req)
                },
                {
                    $set: {
                        isActive: false,
                        updatedAt: new Date()
                    }
                }
            );

        if (!result.matchedCount) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบเป้าหมายนี้'
            });
        }

        res.json({
            success: true,
            message: 'ปิดใช้งานเป้าหมายแล้ว'
        });
    } catch (error) {
        console.error('Delete habit error:', error);

        res.status(500).json({
            success: false,
            message: 'ไม่สามารถปิดใช้งานได้'
        });
    }
});

module.exports = router;
