const express = require('express');
const router = express.Router();
const { authenticate, can } = require('../middleware/auth');
const {
  createCondition,
  getAllConditions,
  getConditionById,
  updateCondition,
  deleteCondition,
} = require('../controllers/condition.controller');

// Permission matrix: view = any logged-in role (patient/doctor/admin), manage = admin only.
const canManage = can((req) => req.user.role === 'admin');

router.get('/', authenticate, getAllConditions);
router.get('/:id', authenticate, getConditionById);

router.post('/', authenticate, canManage, createCondition);
router.put('/:id', authenticate, canManage, updateCondition);
router.delete('/:id', authenticate, canManage, deleteCondition);

module.exports = router;