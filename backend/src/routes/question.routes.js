const express = require('express');
const router = express.Router();
const { authenticate, can } = require('../middleware/auth');
const {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
} = require('../controllers/question.controller');

// Raw question management is an admin-panel concern. Patients/doctors read
// questions through GET /symptoms/:id/questions instead.
const canManage = can((req) => req.user.role === 'admin');

router.get('/', authenticate, canManage, getAllQuestions);
router.get('/:id', authenticate, canManage, getQuestionById);
router.post('/', authenticate, canManage, createQuestion);
router.put('/:id', authenticate, canManage, updateQuestion);
router.delete('/:id', authenticate, canManage, deleteQuestion);

module.exports = router;