const express = require('express');
const router = express.Router();
const { authenticate, can } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const isAdmin = can((req) => req.user.role === 'admin');

// GET /urgency-booking-rules — any logged-in user (patient reads during booking)
router.get('/', authenticate, async (req, res) => {
  try {
    const rules = await prisma.urgencyBookingRule.findMany({
      orderBy: { urgencyLevel: 'asc' },
    });
    return res.json({ rules });
  } catch (err) {
    console.error('listUrgencyRules error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// PUT /urgency-booking-rules/:level — admin only
router.put('/:level', authenticate, isAdmin, async (req, res) => {
  try {
    const level = req.params.level;
    const { minHoursAhead, maxDaysAhead, radiusKm, message } = req.body;

    const existing = await prisma.urgencyBookingRule.findUnique({
      where: { urgencyLevel: level },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Urgency rule not found.' });
    }

    const data = {};
    if (Number.isInteger(minHoursAhead)) data.minHoursAhead = minHoursAhead;
    if (Number.isInteger(maxDaysAhead)) data.maxDaysAhead = maxDaysAhead;
    if (Number.isInteger(radiusKm)) data.radiusKm = radiusKm;
    if (typeof message === 'string') data.message = message;
    data.updatedAt = new Date();

    const updated = await prisma.urgencyBookingRule.update({
      where: { urgencyLevel: level },
      data,
    });
    return res.json({ rule: updated });
  } catch (err) {
    console.error('updateUrgencyRule error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

module.exports = router;