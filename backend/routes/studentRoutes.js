const express = require('express');
const { body, param } = require('express-validator');
const studentController = require('../controllers/studentController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(requireAuth, requireRole('student'));

router.get('/dashboard', studentController.getDashboardSummary);
router.get('/profile', studentController.getProfile);

router.put(
  '/profile',
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be 2 to 100 characters.'),
    body('rollNumber')
      .trim()
      .notEmpty()
      .withMessage('University Roll Number is required.'),
    body('department').trim().notEmpty().withMessage('Department is required.'),
    body('branch').trim().notEmpty().withMessage('Branch is required.'),
    body('academicYear').trim().notEmpty().withMessage('Academic year is required.'),
    body('semester')
      .isInt({ min: 1, max: 8 })
      .withMessage('Semester must be between 1 and 8.'),
    body('cgpa')
      .isFloat({ min: 0, max: 10 })
      .withMessage('CGPA must be between 0.0 and 10.0.'),
    body('backlogs')
      .isInt({ min: 0 })
      .withMessage('Backlogs must be 0 or greater.'),
    validateRequest,
  ],
  studentController.updateProfile
);

// Skills
router.get('/skills', studentController.listSkills);
router.post(
  '/skills',
  [
    body('name').trim().isLength({ min: 1, max: 60 }).withMessage('Skill name is required (max 60 chars).'),
    body('category')
      .isIn(['technical', 'soft'])
      .withMessage('Skill category must be "technical" or "soft".'),
    body('proficiency')
      .optional()
      .isIn(['Beginner', 'Intermediate', 'Advanced'])
      .withMessage('Proficiency must be Beginner, Intermediate, or Advanced.'),
    validateRequest,
  ],
  studentController.addSkill
);
router.put(
  '/skills/:id',
  [
    param('id').isMongoId().withMessage('Invalid skill ID.'),
    body('name').optional().trim().isLength({ min: 1, max: 60 }).withMessage('Skill name cannot be empty.'),
    body('category')
      .optional()
      .isIn(['technical', 'soft'])
      .withMessage('Skill category must be "technical" or "soft".'),
    body('proficiency')
      .optional()
      .isIn(['Beginner', 'Intermediate', 'Advanced'])
      .withMessage('Invalid proficiency level.'),
    validateRequest,
  ],
  studentController.updateSkill
);
router.delete(
  '/skills/:id',
  [param('id').isMongoId().withMessage('Invalid skill ID.'), validateRequest],
  studentController.deleteSkill
);

// Projects
router.get('/projects', studentController.listProjects);
router.post(
  '/projects',
  [
    body('title').trim().notEmpty().withMessage('Project title is required.'),
    body('description').trim().notEmpty().withMessage('Project description is required.'),
    validateRequest,
  ],
  studentController.addProject
);
router.put(
  '/projects/:id',
  [
    param('id').isMongoId().withMessage('Invalid project ID.'),
    body('title').optional().trim().notEmpty().withMessage('Project title cannot be empty.'),
    body('description').optional().trim().notEmpty().withMessage('Project description cannot be empty.'),
    validateRequest,
  ],
  studentController.updateProject
);
router.delete(
  '/projects/:id',
  [param('id').isMongoId().withMessage('Invalid project ID.'), validateRequest],
  studentController.deleteProject
);

// Certifications
router.get('/certifications', studentController.listCertifications);
router.post(
  '/certifications',
  [
    body('title').trim().notEmpty().withMessage('Certification title is required.'),
    body('issuingOrganization').trim().notEmpty().withMessage('Issuing organization is required.'),
    body('issueDate').isISO8601().withMessage('Valid issue date is required.'),
    validateRequest,
  ],
  studentController.addCertification
);
router.put(
  '/certifications/:id',
  [
    param('id').isMongoId().withMessage('Invalid certification ID.'),
    body('title').optional().trim().notEmpty().withMessage('Certification title cannot be empty.'),
    body('issuingOrganization')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Issuing organization cannot be empty.'),
    body('issueDate').optional().isISO8601().withMessage('Valid issue date is required.'),
    validateRequest,
  ],
  studentController.updateCertification
);
router.delete(
  '/certifications/:id',
  [param('id').isMongoId().withMessage('Invalid certification ID.'), validateRequest],
  studentController.deleteCertification
);

module.exports = router;
