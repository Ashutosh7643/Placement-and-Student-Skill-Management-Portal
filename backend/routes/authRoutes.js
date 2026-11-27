const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be 2 to 100 characters.'),
    body('email').trim().isEmail().withMessage('Please enter a valid email address.'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long.'),
    body('rollNumber')
      .trim()
      .notEmpty()
      .withMessage('University Roll Number / Student ID is required.'),
    body('department').trim().notEmpty().withMessage('Department is required.'),
    body('branch').trim().notEmpty().withMessage('Branch is required.'),
    body('academicYear').trim().notEmpty().withMessage('Academic year is required.'),
    body('semester')
      .isInt({ min: 1, max: 8 })
      .withMessage('Semester must be a number between 1 and 8.'),
    body('cgpa')
      .isFloat({ min: 0, max: 10 })
      .withMessage('CGPA must be between 0.0 and 10.0.'),
    body('backlogs')
      .optional({ checkFalsy: false })
      .isInt({ min: 0 })
      .withMessage('Backlogs must be 0 or a positive integer.'),
    validateRequest,
  ],
  authController.registerStudent
);

router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Please enter a valid email address.'),
    body('password').notEmpty().withMessage('Password is required.'),
    validateRequest,
  ],
  authController.login
);

router.post('/logout', authController.logout);

router.get('/me', requireAuth, authController.getCurrentUser);

module.exports = router;
