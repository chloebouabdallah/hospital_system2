const express = require('express');
const router = express.Router();
const { authenticate, can } = require('../middleware/auth');
const { moderateReview } = require('../controllers/review.controller');

const canManage = can((req) => req.user.role === 'admin');

router.patch('/:id/hide', authenticate, canManage, moderateReview);

module.exports = router;