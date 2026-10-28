const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getPatientOverview } = require('../controllers/patient.controller');

router.get('/overview', authenticate, getPatientOverview);

module.exports = router;