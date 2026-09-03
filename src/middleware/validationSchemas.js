const Joi = require('joi');
const ROLES = require('../constants/roles');

// --- Joi Validation Schemas ---

// POST /api/auth/login
const loginSchema = Joi.object({
  usn: Joi.string().required().messages({
    'any.required': 'USN is required',
    'string.empty': 'USN cannot be empty',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
    'string.empty': 'Password cannot be empty',
  }),
});

// POST /api/admin/add-user
const addUserSchema = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'Name is required',
  }),
  usn: Joi.string().optional(),
  employeeId: Joi.string().optional(),
  email: Joi.string().email().required().messages({
    'any.required': 'Email is required',
    'string.email': 'Email must be a valid email address',
  }),
  password: Joi.string().min(6).required().messages({
    'any.required': 'Password is required',
    'string.min': 'Password must be at least 6 characters',
  }),
  role: Joi.string().valid(ROLES.STUDENT, ROLES.FACULTY, ROLES.HOD, ROLES.PRINCIPAL, ROLES.ADMIN).required().messages({
    'any.required': 'Role is required',
    'any.only': 'Role must be one of: student, faculty, hod, principal, admin',
  }),
  branch: Joi.string().required().messages({
    'any.required': 'Branch is required',
  }),
  // sem is required only when role is 'student', must be 1-8
  sem: Joi.when('role', {
    is: ROLES.STUDENT,
    then: Joi.number().integer().min(1).max(8).required().messages({
      'any.required': 'Semester is required for students',
      'number.min': 'Semester must be between 1 and 8',
      'number.max': 'Semester must be between 1 and 8',
    }),
    otherwise: Joi.number().integer().min(1).max(8).optional().allow(null),
  }),
}).or('usn', 'employeeId').messages({
  'object.missing': 'USN or Employee ID is required',
});

// POST /api/faculty/attendance
const attendanceSchema = Joi.object({
  subject: Joi.string().required(),
  date: Joi.date().required(),
  branch: Joi.string().required(),
  sem: Joi.number().integer().required(),
  records: Joi.array().min(1).items(
    Joi.object({
      student: Joi.string().required().messages({
        'any.required': 'Each record must have a student ID',
      }),
      studentName: Joi.string().optional(),
      studentUsn: Joi.string().optional(),
      status: Joi.string().valid('Present', 'Absent').required().messages({
        'any.required': 'Each record must have a status',
        'any.only': 'Status must be either "Present" or "Absent"',
      }),
    })
  ).required().messages({
    'array.min': 'Attendance records cannot be empty',
    'any.required': 'Attendance records array is required',
  }),
});

// POST /api/faculty/marks
const marksSchema = Joi.object({
  marksList: Joi.array().min(1).items(
    Joi.object({
      student: Joi.string().required(),
      subject: Joi.string().required(),
      assessmentName: Joi.string().required(),
      marksObtained: Joi.number().min(0).required(),
      maxMarks: Joi.number().min(0).default(20),
    }).custom((value, helpers) => {
      // Custom validation: marksObtained cannot exceed maxMarks
      if (value.marksObtained > value.maxMarks) {
        return helpers.error('any.invalid', {
          message: `marksObtained (${value.marksObtained}) cannot exceed maxMarks (${value.maxMarks})`,
        });
      }
      return value;
    }, 'marksObtained vs maxMarks check')
  ).required().messages({
    'array.min': 'Marks list cannot be empty',
    'any.required': 'marksList array is required',
    'any.invalid': 'marksObtained cannot exceed maxMarks',
  }),
});

// --- NEW: Audit Fix Step 4 — Schemas for previously unvalidated endpoints ---

// POST /api/faculty/assignments
const createAssignmentSchema = Joi.object({
  title: Joi.string().required().messages({
    'any.required': 'Assignment title is required',
    'string.empty': 'Assignment title cannot be empty',
  }),
  description: Joi.string().required().messages({
    'any.required': 'Assignment description is required',
  }),
  subject: Joi.string().required().messages({
    'any.required': 'Subject is required',
  }),
  branch: Joi.string().required().messages({
    'any.required': 'Branch is required',
  }),
  sem: Joi.number().integer().min(1).max(8).required().messages({
    'any.required': 'Semester is required',
    'number.min': 'Semester must be between 1 and 8',
    'number.max': 'Semester must be between 1 and 8',
  }),
  deadline: Joi.date().iso().required().messages({
    'any.required': 'Deadline is required',
    'date.format': 'Deadline must be a valid ISO date',
  }),
  fileUrl: Joi.string().uri().optional(),
});

// POST /api/student/submit
const submitAssignmentSchema = Joi.object({
  assignmentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'any.required': 'Assignment ID is required',
    'string.pattern.base': 'Assignment ID must be a valid 24-character MongoDB ObjectId',
  }),
  fileUrl: Joi.string().uri().optional(),
});

// POST /api/feed/create
const createPostSchema = Joi.object({
  title: Joi.string().required().messages({
    'any.required': 'Post title is required',
    'string.empty': 'Post title cannot be empty',
  }),
  content: Joi.string().required().messages({
    'any.required': 'Post content is required',
    'string.empty': 'Post content cannot be empty',
  }),
  branchTag: Joi.string().optional(),
  isImportant: Joi.boolean().optional(),
  hasAttachment: Joi.boolean().optional(),
  attachmentUrl: Joi.string().uri().optional(),
});

// POST /api/feed/broadcast
const broadcastSchema = Joi.object({
  title: Joi.string().required().messages({
    'any.required': 'Broadcast title is required',
    'string.empty': 'Broadcast title cannot be empty',
  }),
  content: Joi.string().required().messages({
    'any.required': 'Broadcast content is required',
    'string.empty': 'Broadcast content cannot be empty',
  }),
  isImportant: Joi.boolean().optional(),
});

// POST /api/admin/promote
const promoteSchema = Joi.object({  branch: Joi.string().required().messages({
    'any.required': 'Branch is required',
    'string.empty': 'Branch cannot be empty',
  }),
  currentSem: Joi.number().integer().min(1).max(8).required().messages({
    'any.required': 'Current semester is required',
    'number.min': 'Semester must be between 1 and 8',
    'number.max': 'Semester must be between 1 and 8',
  }),
});

// POST /api/auth/change-password
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required',
    'string.empty': 'Current password cannot be empty',
  }),
  newPassword: Joi.string().min(6).required().messages({
    'any.required': 'New password is required',
    'string.empty': 'New password cannot be empty',
    'string.min': 'New password must be at least 6 characters',
  }),
});

module.exports = {
  loginSchema,
  addUserSchema,
  attendanceSchema,
  marksSchema,
  createAssignmentSchema,
  submitAssignmentSchema,
  createPostSchema,
  broadcastSchema,
  promoteSchema,
  changePasswordSchema,
};
