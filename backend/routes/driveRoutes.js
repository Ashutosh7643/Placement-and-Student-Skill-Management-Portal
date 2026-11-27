const express = require('express');
const { param } = require('express-validator');
const driveController = require('../controllers/driveController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(requireAuth);

router.get('/', driveController.listDrives);

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid placement drive ID.'), validateRequest],
  driveController.getDriveDetails
);

router.get(
  '/:id/evaluate',
  requireRole('student'),
  [param('id').isMongoId().withMessage('Invalid placement drive ID.'), validateRequest],
  driveController.evaluateDriveForStudent
);

module.exports = router;
