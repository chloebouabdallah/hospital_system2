const express = require('express');
const router = express.Router();
const { authenticate, can } = require('../middleware/auth');
const {
  createSymptom,
  getAllSymptoms,
  getSymptomById,
  updateSymptom,
  deleteSymptom,
} = require('../controllers/symptom.controller');
const { getSymptomQuestions } = require('../controllers/question.controller');

// Permission matrix: view = any logged-in role (patient/doctor/admin), manage = admin only.
const canManage = can((req) => req.user.role === 'admin');

router.get('/', authenticate, getAllSymptoms);
router.get('/:id', authenticate, getSymptomById);
router.get('/:id/questions', authenticate, getSymptomQuestions);

router.post('/', authenticate, canManage, createSymptom);
router.put('/:id', authenticate, canManage, updateSymptom);
router.delete('/:id', authenticate, canManage, deleteSymptom);

module.exports = router;