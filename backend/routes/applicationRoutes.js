const express = require('express');
const { body } = require('express-validator');
const applicationController = require('../controllers/applicationController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(requireAuth, requireRole('student'));

router.get('/my', applicationController.getMyApplications);

router.post(
  '/',
  [
    body('driveId').isMongoId().withMessage('Valid placement drive ID is required.'),
    validateRequest,
  ],
  applicationController.applyToDrive
);

module.exports = router;
