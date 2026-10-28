const express = require('express');
const router = express.Router();
const { authenticate, can } = require('../middleware/auth');
const {
  createRule,
  getAllRules,
  getRuleById,
  updateRule,
  deleteRule,
} = require('../controllers/triage-rule.controller');

// Rules are management data: admin-only for every method, including reads.
const canManage = can((req) => req.user.role === 'admin');

router.get('/', authenticate, canManage, getAllRules);
router.get('/:id', authenticate, canManage, getRuleById);
router.post('/', authenticate, canManage, createRule);
router.put('/:id', authenticate, canManage, updateRule);
router.delete('/:id', authenticate, canManage, deleteRule);

module.exports = router;