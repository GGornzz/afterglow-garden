
const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');
const {
    requireAuth
} = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

const QUESTS = [
    {
        id: 'first-step',
        title: 'First Step',
        description: 'ทำ Habit ให้สำเร็จ 1 รายการในวันนี้',
        icon: '🌱',
        type: 'daily',
        metric: 'today',
        target: 1,
        rewardXP: 10,
        rewardCoins: 5
    },
    {
        id: 'daily-bloom',
        title: 'Daily Bloom',
        description: 'ทำ Habit ให้สำเร็จ 3 รายการในวันนี้',
        icon: '🌸',
        type: 'daily',
        metric: 'today',
        target: 3,
        rewardXP: 30,
        rewardCoins: 15
    },
    {
        id: 'first-flower',
        title: 'First Flower',
        description: 'ทำ Habit สำเร็จเป็นครั้งแรก',
        icon: '✨',
        type: 'achievement',
        metric: 'allTime',
        target: 1,
        rewardXP: 20,
        rewardCoins: 10
    },
    {
        id: 'garden-beginner',
        title: 'Garden Beginner',
        description: 'ปลูกต้นไม้ต้นแรกในสวนของคุณ',
        icon: '🌿',
        type: 'achievement',
        metric: 'plants',
        target: 1,
        rewardXP: 25,
        rewardCoins: 15
    },
    {
        id: 'growth-explorer',
        title: 'Growth Explorer',
        description: 'ทำ Habit สำเร็จสะสม 5 ครั้ง',
        icon: '🏆',
        type: 'achievement',
        metric: 'allTime',
        target: 5,
        rewardXP: 50,
        rewardCoins: 25
    }
];

function todayKey() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(new Date());

    const value = type =>
        parts.find(part => part.type === type).value;

    return `${value('year')}-${value('month')}-${value('day')}`;
}

function questKey(quest, date) {
    return quest.type === 'daily'
        ? `${quest.id}:${date}`
        : quest.id;
}

async function getMetrics(db, userId, date) {
    const [today, allTime, plants] = await Promise.all([
        db.collection('habitLogs').countDocuments({
            userId,
            logDate: date,
            status: 'completed',
            rewardApplied: true
        }),
        db.collection('habitLogs').countDocuments({
            userId,
            status: 'completed',
            rewardApplied: true
        }),
        db.collection('gardenPlants').countDocuments({
            userId
        })
    ]);

    return { today, allTime, plants };
}

function presentQuest(quest, metrics, claimedKeys, date) {
    const progress = Math.min(
        metrics[quest.metric] || 0,
        quest.target
    );

    const key = questKey(quest, date);
    const claimed = claimedKeys.includes(key);

    return {
        id: quest.id,
        title: quest.title,
        description: quest.description,
        icon: quest.icon,
        type: quest.type,
        target: quest.target,
        progress,
        rewardXP: quest.rewardXP,
        rewardCoins: quest.rewardCoins,
        completed: progress >= quest.target,
        claimed,
        canClaim: progress >= quest.target && !claimed
    };
}

// GET /api/quests
router.get('/', async (req, res) => {
    try {
        const db = getDB();
        const userId = new ObjectId(req.session.userId);
        const date = todayKey();

        const [user, metrics] = await Promise.all([
            db.collection('users').findOne({
                _id: userId
            }),
            getMetrics(db, userId, date)
        ]);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'ไม่พบข้อมูลสมาชิก'
            });
        }

        const claimedKeys = user.claimedQuestKeys || [];

        const quests = QUESTS.map(quest =>
            presentQuest(quest, metrics, claimedKeys, date)
        );

        res.json({
            success: true,
            date,
            quests,
            user: {
                xp: user.xp,
                coins: user.coins,
                level: Math.floor(user.xp / 100) + 1
            }
        });
    } catch (error) {
        console.error('Get quests error:', error);

        res.status(500).json({
            success: false,
            message: 'โหลดภารกิจไม่สำเร็จ'
        });
    }
});

// POST /api/quests/:id/claim
router.post('/:id/claim', async (req, res) => {
    try {
        const quest = QUESTS.find(
            item => item.id === req.params.id
        );

        if (!quest) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบภารกิจนี้'
            });
        }

        const db = getDB();
        const userId = new ObjectId(req.session.userId);
        const date = todayKey();
        const key = questKey(quest, date);

        // Backend ตรวจความสำเร็จจากฐานข้อมูลจริง
        const metrics = await getMetrics(db, userId, date);

        if (metrics[quest.metric] < quest.target) {
            return res.status(400).json({
                success: false,
                message: 'ยังทำภารกิจไม่ครบเงื่อนไข'
            });
        }

        // บันทึกการเคลมและเพิ่มรางวัลภายใน
        // Document เดียวกันแบบ Atomic
        const result = await db.collection('users').updateOne(
            {
                _id: userId,
                claimedQuestKeys: { $ne: key }
            },
            {
                $addToSet: {
                    claimedQuestKeys: key
                },
                $inc: {
                    xp: quest.rewardXP,
                    coins: quest.rewardCoins
                }
            }
        );

        if (result.matchedCount === 0) {
            const existingUser = await db
                .collection('users')
                .findOne({ _id: userId });

            return res.status(
                existingUser ? 409 : 401
            ).json({
                success: false,
                message: existingUser
                    ? 'รับรางวัลภารกิจนี้ไปแล้ว'
                    : 'ไม่พบข้อมูลสมาชิก'
            });
        }

        const user = await db.collection('users').findOne({
            _id: userId
        });

        const level = Math.floor(user.xp / 100) + 1;

        // เพิ่ม Level เท่านั้น ไม่ปรับลด
        await db.collection('users').updateOne(
            { _id: userId },
            { $max: { level } }
        );

        res.json({
            success: true,
            message: `รับรางวัล ${quest.title} สำเร็จ!`,
            reward: {
                xp: quest.rewardXP,
                coins: quest.rewardCoins
            },
            user: {
                xp: user.xp,
                coins: user.coins,
                level
            }
        });
    } catch (error) {
        console.error('Claim quest error:', error);

        res.status(500).json({
            success: false,
            message: 'รับรางวัลไม่สำเร็จ'
        });
    }
});

module.exports = router;
