const express = require('express');
const { body, param } = require('express-validator');
const adminController = require('../controllers/adminController');
const { APPLICATION_STATUSES } = require('../models/Application');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/dashboard', adminController.getDashboardStats);
router.get('/reports', adminController.getReports);

// Students
router.get('/students', adminController.listStudents);
router.get(
  '/students/:id',
  [param('id').isMongoId().withMessage('Invalid student ID.'), validateRequest],
  adminController.getStudentDetails
);
router.put(
  '/students/:id',
  [
    param('id').isMongoId().withMessage('Invalid student ID.'),
    body('cgpa').optional().isFloat({ min: 0, max: 10 }).withMessage('CGPA must be between 0 and 10.'),
    body('backlogs').optional().isInt({ min: 0 }).withMessage('Backlogs must be 0 or greater.'),
    body('semester').optional().isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8.'),
    validateRequest,
  ],
  adminController.updateStudentRecord
);

// Companies
router.get('/companies', adminController.listCompanies);
router.post(
  '/companies',
  [
    body('name').trim().notEmpty().withMessage('Company name is required.'),
    body('industry').trim().notEmpty().withMessage('Industry is required.'),
    body('location').trim().notEmpty().withMessage('Company location is required.'),
    body('hrEmail').optional({ checkFalsy: true }).isEmail().withMessage('Invalid HR email address.'),
    validateRequest,
  ],
  adminController.createCompany
);
router.put(
  '/companies/:id',
  [
    param('id').isMongoId().withMessage('Invalid company ID.'),
    body('name').optional().trim().notEmpty().withMessage('Company name cannot be empty.'),
    body('industry').optional().trim().notEmpty().withMessage('Industry cannot be empty.'),
    body('location').optional().trim().notEmpty().withMessage('Location cannot be empty.'),
    body('hrEmail').optional({ checkFalsy: true }).isEmail().withMessage('Invalid HR email address.'),
    validateRequest,
  ],
  adminController.updateCompany
);
router.delete(
  '/companies/:id',
  [param('id').isMongoId().withMessage('Invalid company ID.'), validateRequest],
  adminController.deleteCompany
);

// Drives
router.get('/drives', adminController.listDrivesAdmin);
router.post(
  '/drives',
  [
    body('company').isMongoId().withMessage('Valid company ID is required.'),
    body('title').trim().notEmpty().withMessage('Drive title is required.'),
    body('jobRole').trim().notEmpty().withMessage('Job role is required.'),
    body('description').trim().notEmpty().withMessage('Job description is required.'),
    body('packageLPA').isFloat({ min: 0 }).withMessage('Package (LPA) must be 0 or greater.'),
    body('location').trim().notEmpty().withMessage('Location is required.'),
    body('jobType')
      .optional()
      .isIn(['Full-Time', 'Internship + PPO', 'Internship'])
      .withMessage('Invalid job type.'),
    body('minCgpa').isFloat({ min: 0, max: 10 }).withMessage('Minimum CGPA must be between 0 and 10.'),
    body('maxBacklogs').isInt({ min: 0 }).withMessage('Maximum backlogs must be 0 or greater.'),
    body('eligibleBranches').notEmpty().withMessage('Eligible branches are required.'),
    body('applicationDeadline').isISO8601().withMessage('Valid application deadline is required.'),
    body('status')
      .optional()
      .isIn(['Open', 'Upcoming', 'Closed', 'Completed'])
      .withMessage('Invalid drive status.'),
    validateRequest,
  ],
  adminController.createDrive
);
router.put(
  '/drives/:id',
  [
    param('id').isMongoId().withMessage('Invalid drive ID.'),
    body('company').optional().isMongoId().withMessage('Valid company ID is required.'),
    body('packageLPA').optional().isFloat({ min: 0 }).withMessage('Package must be 0 or greater.'),
    body('minCgpa').optional().isFloat({ min: 0, max: 10 }).withMessage('Minimum CGPA must be 0 to 10.'),
    body('maxBacklogs').optional().isInt({ min: 0 }).withMessage('Maximum backlogs must be 0 or greater.'),
    body('applicationDeadline').optional().isISO8601().withMessage('Valid deadline date required.'),
    body('status')
      .optional()
      .isIn(['Open', 'Upcoming', 'Closed', 'Completed'])
      .withMessage('Invalid drive status.'),
    validateRequest,
  ],
  adminController.updateDrive
);
router.delete(
  '/drives/:id',
  [param('id').isMongoId().withMessage('Invalid drive ID.'), validateRequest],
  adminController.deleteDrive
);

// Applications
router.get('/applications', adminController.listApplications);
router.put(
  '/applications/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid application ID.'),
    body('status')
      .isIn(APPLICATION_STATUSES)
      .withMessage(`Status must be one of: ${APPLICATION_STATUSES.join(', ')}`),
    validateRequest,
  ],
  adminController.updateApplicationStatus
);

module.exports = router;
