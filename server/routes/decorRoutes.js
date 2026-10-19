
const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');
const { requireAuth } = require('../middleware/authMiddleware');
const { ITEMS } = require('./shopRoutes');

const router = express.Router();
router.use(requireAuth);

const TOTAL_SLOTS = 8;

function userId(req) {
    return new ObjectId(req.session.userId);
}

function isValidSlot(slot) {
    return Number.isInteger(slot) &&
        slot >= 0 &&
        slot < TOTAL_SLOTS;
}

function isValidId(id) {
    return typeof id === 'string' &&
        /^[0-9a-fA-F]{24}$/.test(id);
}

function getCatalogItem(itemId) {
    return ITEMS.find(item => item.id === itemId);
}

function presentDecoration(decoration) {
    const item = getCatalogItem(decoration.itemId);

    return {
        placementId: decoration.placementId.toString(),
        itemId: decoration.itemId,
        slot: decoration.slot,
        name: item?.name || 'Decoration',
        icon: item?.icon || '🌱'
    };
}

// ====================================
// GET /api/decor
// โหลดของตกแต่งและ Inventory
// ====================================

router.get('/', async (req, res) => {
    try {
        const user = await getDB()
            .collection('users')
            .findOne(
                { _id: userId(req) },
                {
                    projection: {
                        inventory: 1,
                        gardenDecorations: 1
                    }
                }
            );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'ไม่พบสมาชิก'
            });
        }

        const inventory = user.inventory || {};
        const decorations = user.gardenDecorations || [];

        res.json({
            success: true,
            totalSlots: TOTAL_SLOTS,
            decorations: decorations.map(presentDecoration),
            inventory: ITEMS.map(item => ({
                id: item.id,
                name: item.name,
                icon: item.icon,
                quantity: inventory[item.id] || 0
            })).filter(item => item.quantity > 0)
        });
    } catch (error) {
        console.error('Load decorations:', error);

        res.status(500).json({
            success: false,
            message: 'โหลดของตกแต่งไม่สำเร็จ'
        });
    }
});

// ====================================
// POST /api/decor/place
// ใช้ไอเทม 1 ชิ้นวางลงช่องว่าง
// ====================================

router.post('/place', async (req, res) => {
    try {
        const { itemId, slot } = req.body || {};

        const item = typeof itemId === 'string'
            ? getCatalogItem(itemId)
            : null;

        if (!item || !isValidSlot(slot)) {
            return res.status(400).json({
                success: false,
                message: 'สินค้า หรือตำแหน่งไม่ถูกต้อง'
            });
        }

        const placementId = new ObjectId();
        const inventoryField = `inventory.${item.id}`;

        const result = await getDB()
            .collection('users')
            .updateOne(
                {
                    _id: userId(req),
                    [inventoryField]: { $gte: 1 },
                    gardenDecorations: {
                        $not: {
                            $elemMatch: { slot }
                        }
                    }
                },
                {
                    $inc: {
                        [inventoryField]: -1
                    },
                    $push: {
                        gardenDecorations: {
                            placementId,
                            itemId: item.id,
                            slot,
                            placedAt: new Date()
                        }
                    }
                }
            );

        if (result.matchedCount === 0) {
            return res.status(409).json({
                success: false,
                message:
                    'ช่องนี้มีของอยู่แล้ว หรือ Inventory ไม่มีสินค้านี้'
            });
        }

        res.status(201).json({
            success: true,
            message: `วาง ${item.name} สำเร็จ 🌿`,
            decoration: {
                placementId: placementId.toString(),
                itemId: item.id,
                slot,
                name: item.name,
                icon: item.icon
            }
        });
    } catch (error) {
        console.error('Place decoration:', error);

        res.status(500).json({
            success: false,
            message: 'วางของตกแต่งไม่สำเร็จ'
        });
    }
});

// ====================================
// DELETE /api/decor/:placementId
// เก็บไอเทมคืน Inventory
// ====================================

router.delete('/:placementId', async (req, res) => {
    try {
        if (!isValidId(req.params.placementId)) {
            return res.status(400).json({
                success: false,
                message: 'รหัสของตกแต่งไม่ถูกต้อง'
            });
        }

        const db = getDB();
        const ownerId = userId(req);
        const placementId = new ObjectId(
            req.params.placementId
        );

        const user = await db.collection('users')
            .findOne(
                {
                    _id: ownerId,
                    'gardenDecorations.placementId': placementId
                },
                {
                    projection: {
                        gardenDecorations: 1
                    }
                }
            );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบของตกแต่งชิ้นนี้'
            });
        }

        const decoration = (
            user.gardenDecorations || []
        ).find(d => d.placementId.equals(placementId));

        const item = decoration
            ? getCatalogItem(decoration.itemId)
            : null;

        if (!item) {
            return res.status(400).json({
                success: false,
                message: 'ไม่พบข้อมูลสินค้าในร้าน'
            });
        }

        // เก็บคืนและเพิ่มจำนวนใน Inventory
        // พร้อมกันใน Document เดียว
        const result = await db.collection('users')
            .updateOne(
                {
                    _id: ownerId,
                    'gardenDecorations.placementId': placementId
                },
                {
                    $pull: {
                        gardenDecorations: { placementId }
                    },
                    $inc: {
                        [`inventory.${item.id}`]: 1
                    }
                }
            );

        if (result.matchedCount === 0) {
            return res.status(409).json({
                success: false,
                message: 'ไอเทมชิ้นนี้ถูกเก็บไปแล้ว'
            });
        }

        res.json({
            success: true,
            message: `เก็บ ${item.name} คืน Inventory แล้ว`
        });
    } catch (error) {
        console.error('Remove decoration:', error);

        res.status(500).json({
            success: false,
            message: 'เก็บของตกแต่งไม่สำเร็จ'
        });
    }
});

module.exports = router;
