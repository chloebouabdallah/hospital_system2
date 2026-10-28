const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createAvailability,
  listAvailability,
  getAvailabilityById,
  updateAvailability,
  deleteAvailability,
} = require('../controllers/availability.controller');

router.get('/', authenticate, listAvailability);
router.get('/:id', authenticate, getAvailabilityById);
router.post('/', authenticate, createAvailability);
router.put('/:id', authenticate, updateAvailability);
router.delete('/:id', authenticate, deleteAvailability);

module.exports = router;