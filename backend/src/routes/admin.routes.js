const express = require('express');
const router = express.Router();
const { authenticate, can } = require('../middleware/auth');
const { getOverview } = require('../controllers/admin.controller');
const { getAllReviews } = require('../controllers/review.controller');

const isAdmin = can((req) => req.user.role === 'admin');

router.get('/overview', authenticate, isAdmin, getOverview);
router.get('/reviews', authenticate, isAdmin, getAllReviews);

module.exports = router;