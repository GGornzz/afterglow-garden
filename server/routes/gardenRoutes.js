
const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');
const {
    requireAuth
} = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

const PLANT_TYPES = {
    fern: {
        name: 'Little Fern',
        matureEmoji: '🌿'
    },
    flower: {
        name: 'Blooming Flower',
        matureEmoji: '🌻'
    },
    tree: {
        name: 'Little Oak',
        matureEmoji: '🌳'
    }
};

function currentUserId(req) {
    return new ObjectId(req.session.userId);
}

function validId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
}

function getStage(count) {
    if (count >= 5) {
        return {
            stage: 4,
            stageName: 'Mature',
            nextTarget: null
        };
    }

    if (count >= 3) {
        return {
            stage: 3,
            stageName: 'Growing',
            nextTarget: 5
        };
    }

    if (count >= 1) {
        return {
            stage: 2,
            stageName: 'Seedling',
            nextTarget: 3
        };
    }

    return {
        stage: 1,
        stageName: 'Seed',
        nextTarget: 1
    };
}

// ====================================
// GET /api/garden
// แสดงต้นไม้ของผู้ใช้
// ====================================

router.get('/', async (req, res) => {
    try {
        const db = getDB();
        const userId = currentUserId(req);

        const plants = await db.collection('gardenPlants')
            .find({ userId })
            .sort({ plantedAt: 1 })
            .toArray();

        const habitIds = plants.map(plant => plant.habitId);

        const habits = habitIds.length
            ? await db.collection('habits')
                .find({
                    _id: { $in: habitIds },
                    userId
                })
                .toArray()
            : [];

        const habitMap = new Map(
            habits.map(habit => [
                habit._id.toString(),
                habit
            ])
        );

        const counts = habitIds.length
            ? await db.collection('habitLogs').aggregate([
                {
                    $match: {
                        userId,
                        habitId: { $in: habitIds },
                        status: 'completed'
                    }
                },
                {
                    $group: {
                        _id: '$habitId',
                        count: { $sum: 1 }
                    }
                }
            ]).toArray()
            : [];

        const countMap = new Map(
            counts.map(item => [
                item._id.toString(),
                item.count
            ])
        );

        const result = plants.map(plant => {
            const habitId = plant.habitId.toString();
            const count = countMap.get(habitId) || 0;
            const growth = getStage(count);
            const type = PLANT_TYPES[plant.plantType];

            return {
                _id: plant._id,
                habitId: plant.habitId,
                habitTitle: habitMap.get(habitId)?.title ||
                    'Archived Habit',
                plantType: plant.plantType,
                plantName: type?.name || 'Plant',
                matureEmoji: type?.matureEmoji || '🌳',
                completedDays: count,
                growthPoints: count * 20,
                ...growth,
                plantedAt: plant.plantedAt
            };
        });

        res.json({
            success: true,
            plants: result,
            totalPlants: result.length
        });
    } catch (error) {
        console.error('Load garden error:', error);

        res.status(500).json({
            success: false,
            message: 'โหลดสวนไม่สำเร็จ'
        });
    }
});

// ====================================
// POST /api/garden/plants
// ปลูกต้นไม้ประจำ Habit
// ====================================

router.post('/plants', async (req, res) => {
    try {
        const { habitId, plantType } = req.body || {};

        if (
            typeof habitId !== 'string' ||
            !validId(habitId)
        ) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือก Habit ที่ถูกต้อง'
            });
        }

        if (
            typeof plantType !== 'string' ||
            !PLANT_TYPES[plantType]
        ) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือกชนิดต้นไม้'
            });
        }

        const db = getDB();
        const userId = currentUserId(req);
        const habitObjectId = new ObjectId(habitId);

        const habit = await db.collection('habits').findOne({
            _id: habitObjectId,
            userId,
            isActive: true
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบ Habit ที่เปิดใช้งาน'
            });
        }

        const newPlant = {
            userId,
            habitId: habitObjectId,
            plantType,
            plantedAt: new Date()
        };

        try {
            const result = await db
                .collection('gardenPlants')
                .insertOne(newPlant);

            return res.status(201).json({
                success: true,
                message: 'ปลูกต้นไม้สำเร็จ 🌱',
                plantId: result.insertedId
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message: 'Habit นี้มีต้นไม้แล้ว'
                });
            }

            throw error;
        }
    } catch (error) {
        console.error('Plant seed error:', error);

        res.status(500).json({
            success: false,
            message: 'ปลูกต้นไม้ไม่สำเร็จ'
        });
    }
});

// ====================================
// GET /api/garden/available-habits
// แสดง Habit ที่ยังไม่มีต้นไม้
// ====================================

router.get('/available-habits', async (req, res) => {
    try {
        const db = getDB();
        const userId = currentUserId(req);

        const planted = await db.collection('gardenPlants')
            .find({ userId })
            .project({ habitId: 1 })
            .toArray();

        const plantedIds = planted.map(
            plant => plant.habitId
        );

        const habits = await db.collection('habits')
            .find({
                userId,
                isActive: true,
                _id: { $nin: plantedIds }
            })
            .project({
                title: 1,
                category: 1
            })
            .sort({ createdAt: -1 })
            .toArray();

        res.json({
            success: true,
            habits
        });
    } catch (error) {
        console.error('Available habits error:', error);

        res.status(500).json({
            success: false,
            message: 'โหลดรายการ Habit ไม่สำเร็จ'
        });
    }
});

module.exports = router;
