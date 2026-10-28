const express = require('express');
const router = express.Router();
const { authenticate, authorize, isSelfOrAdmin } = require('../middleware/auth');
const {
  getMe,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controllers/user.controller');

router.get('/me', authenticate, getMe);
router.get('/', authenticate, authorize('admin'), getAllUsers);
router.get('/:id', authenticate, isSelfOrAdmin, getUserById);
router.patch('/:id', authenticate, isSelfOrAdmin, updateUser);
router.delete('/:id', authenticate, authorize('admin'), deleteUser);

module.exports = router;