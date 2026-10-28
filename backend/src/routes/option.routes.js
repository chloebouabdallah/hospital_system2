const express = require('express');
const router = express.Router();
const { authenticate, can } = require('../middleware/auth');
const {
  createOption,
  getAllOptions,
  getOptionById,
  updateOption,
  deleteOption,
} = require('../controllers/option.controller');

const canManage = can((req) => req.user.role === 'admin');

router.get('/', authenticate, canManage, getAllOptions);
router.get('/:id', authenticate, canManage, getOptionById);
router.post('/', authenticate, canManage, createOption);
router.put('/:id', authenticate, canManage, updateOption);
router.delete('/:id', authenticate, canManage, deleteOption);

module.exports = router;