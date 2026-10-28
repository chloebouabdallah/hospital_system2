const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDoctorOverview } = require('../controllers/doctor-dashboard.controller');

router.get('/overview', authenticate, getDoctorOverview);

module.exports = router;