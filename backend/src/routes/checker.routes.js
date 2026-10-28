const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { submit } = require('../controllers/checker.controller');

// Any logged-in role may run the checker (patients use it; doctors/admins can test it).
router.post('/submit', authenticate, submit);

module.exports = router;