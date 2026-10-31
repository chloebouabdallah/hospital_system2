const express = require('express');
const router = express.Router();
const { authenticate, can } = require('../middleware/auth');
const { listReview, setReviewStatus, deleteReviewItem } = require('../controllers/ai-checker.controller');

const isAdmin = can((req) => req.user.role === 'admin');

router.get('/', authenticate, isAdmin, listReview);
router.patch('/:id', authenticate, isAdmin, setReviewStatus);
router.delete('/:id', authenticate, isAdmin, deleteReviewItem);

module.exports = router;
