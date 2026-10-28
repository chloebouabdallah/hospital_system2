const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createAppointment,
  listAppointments,
  getAppointmentById,
  cancelAppointment,
  confirmAppointment,
  completeAppointment,
} = require('../controllers/appointment.controller');
const {
  createReview,
  getReviewForAppointment,
  updateReview,
  deleteReview,
} = require('../controllers/review.controller');

router.get('/', authenticate, listAppointments);
router.get('/:id', authenticate, getAppointmentById);
router.post('/', authenticate, createAppointment);

router.patch('/:id/cancel', authenticate, cancelAppointment);
router.patch('/:id/confirm', authenticate, confirmAppointment);
router.patch('/:id/complete', authenticate, completeAppointment);

// Reviews tied to a completed appointment
router.post('/:id/review', authenticate, createReview);
router.get('/:id/review', authenticate, getReviewForAppointment);
router.put('/:id/review', authenticate, updateReview);
router.delete('/:id/review', authenticate, deleteReview);

module.exports = router;