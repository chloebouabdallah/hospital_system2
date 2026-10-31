const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { submit } = require('../controllers/checker.controller');
const { step } = require('../controllers/ai-checker.controller');


router.post('/submit', authenticate, submit);

router.post('/ai/step', authenticate, step);

module.exports = router;