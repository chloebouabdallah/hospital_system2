const express = require('express');
const router = express.Router();
const { authenticate, can } = require('../middleware/auth');
const {
  createHospital,
  getAllHospitals,
  getNearbyHospitals,
  getHospitalById,
  updateHospital,
  deleteHospital,
} = require('../controllers/hospital.controller');

const canManage = can((req) => req.user.role === 'admin');

// Public, like doctor and specialty search.
router.get('/', getAllHospitals);
router.get('/nearby', getNearbyHospitals); // must stay ABOVE '/:id'
router.get('/:id', getHospitalById);

router.post('/', authenticate, canManage, createHospital);
router.put('/:id', authenticate, canManage, updateHospital);
router.delete('/:id', authenticate, canManage, deleteHospital);

module.exports = router;