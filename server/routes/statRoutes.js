
const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');
const {
    requireAuth
} = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);

// วันที่ตามประเทศไทย
function todayKey() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(new Date());

    const get = type =>
        parts.find(p => p.type === type).value;

    return `${get('year')}-${get('month')}-${get('day')}`;
}

// คำนวณวันที่ย้อนหลังโดยไม่ขึ้นกับ Timezone เครื่อง
function shiftDate(key, days) {
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(
        Date.UTC(year, month - 1, day + days)
    );

    return date.toISOString().slice(0, 10);
}

// นับ Streak จากวันที่ทำกิจกรรมอย่างน้อย 1 ครั้ง
function calculateStreaks(dateKeys, today) {
    const dates = [...new Set(dateKeys)].sort();

    if (!dates.length) {
        return { currentStreak: 0, bestStreak: 0 };
    }

    let bestStreak = 0;
    let running = 0;
    let previous = null;

    for (const date of dates) {
        if (
            previous !== null &&
            shiftDate(previous, 1) === date
        ) {
            running++;
        } else {
            running = 1;
        }

        bestStreak = Math.max(bestStreak, running);
        previous = date;
    }

    const dateSet = new Set(dates);

    let cursor = dateSet.has(today)
        ? today
        : shiftDate(today, -1);

    let currentStreak = 0;

    while (dateSet.has(cursor)) {
        currentStreak++;
        cursor = shiftDate(cursor, -1);
    }

    return { currentStreak, bestStreak };
}

// GET /api/statistics
router.get('/', async (req, res) => {
    try {
        const db = getDB();
        const userId = new ObjectId(req.session.userId);
        const today = todayKey();

        const [
            user,
            habits,
            logs,
            plantCount
        ] = await Promise.all([
            db.collection('users').findOne(
                { _id: userId },
                {
                    projection: {
                        username: 1,
                        level: 1,
                        xp: 1,
                        coins: 1
                    }
                }
            ),

            db.collection('habits').find({
                userId
            }).project({
                isActive: 1
            }).toArray(),

            db.collection('habitLogs').find({
                userId,
                status: 'completed',
                rewardApplied: true
            }).project({
                habitId: 1,
                logDate: 1
            }).toArray(),

            db.collection('gardenPlants').countDocuments({
                userId
            })
        ]);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'ไม่พบข้อมูลสมาชิก'
            });
        }

        const activeHabits = habits.filter(
            habit => habit.isActive
        ).length;

        const completedToday = logs.filter(
            log => log.logDate === today
        ).length;

        const todayRate = activeHabits > 0
            ? Math.min(
                100,
                Math.round(completedToday / activeHabits * 100)
            )
            : 0;

        // กราฟย้อนหลัง 7 วัน รวมวันนี้
        const last7Days = [];

        for (let i = 6; i >= 0; i--) {
            const date = shiftDate(today, -i);

            last7Days.push({
                date,
                count: logs.filter(
                    log => log.logDate === date
                ).length
            });
        }

        const { currentStreak, bestStreak } =
            calculateStreaks(
                logs.map(log => log.logDate),
                today
            );

        const categoryData = {
            totalHabits: habits.length,
            activeHabits,
            pausedHabits: habits.length - activeHabits
        };

        return res.json({
            success: true,
            today,
            user: {
                username: user.username,
                level: Math.floor((user.xp || 0) / 100) + 1,
                xp: user.xp || 0,
                coins: user.coins || 0
            },
            summary: {
                ...categoryData,
                completedToday,
                todayRate,
                totalCompletions: logs.length,
                totalPlants: plantCount,
                currentStreak,
                bestStreak
            },
            last7Days
        });
    } catch (error) {
        console.error('Statistics error:', error);

        return res.status(500).json({
            success: false,
            message: 'โหลดสถิติไม่สำเร็จ'
        });
    }
});

module.exports = router;
