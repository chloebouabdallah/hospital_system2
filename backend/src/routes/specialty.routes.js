const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  createSpecialty,
  getAllSpecialties,
  getSpecialtyById,
  updateSpecialty,
  deleteSpecialty,
} = require('../controllers/specialty.controller');

router.get('/', getAllSpecialties);      // public
router.get('/:id', getSpecialtyById);    // public

router.post('/', authenticate, authorize('admin'), createSpecialty);
router.patch('/:id', authenticate, authorize('admin'), updateSpecialty);
router.delete('/:id', authenticate, authorize('admin'), deleteSpecialty);

module.exports = router;