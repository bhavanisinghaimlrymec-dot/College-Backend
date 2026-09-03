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
  audience: Joi.string().valid('everyone', 'students', 'faculty').optional(),
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
  audience: Joi.string().valid('everyone', 'students', 'faculty').optional(),
  branchTag: Joi.string().optional(),
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

// POST /api/leaves — substitute/periods enforced per-track in the controller
const leaveApplySchema = Joi.object({
  from: Joi.date().iso().required().messages({
    'any.required': 'Leave start date is required',
    'date.format': 'Start date must be a valid ISO date',
  }),
  to: Joi.date().iso().required().messages({
    'any.required': 'Leave end date is required',
    'date.format': 'End date must be a valid ISO date',
  }),
  reason: Joi.string().min(3).required().messages({
    'any.required': 'Reason is required',
    'string.min': 'Reason must be at least 3 characters',
  }),
  substitute: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().messages({
    'string.pattern.base': 'Substitute must be a valid user id',
  }),
  periodsAffected: Joi.array().items(Joi.string()).optional(),
});

// PATCH /api/leaves/:id/decision
const leaveDecisionSchema = Joi.object({
  decision: Joi.string().valid('approve', 'reject').required().messages({
    'any.required': 'Decision is required',
    'any.only': "Decision must be 'approve' or 'reject'",
  }),
  remark: Joi.string().allow('').optional(),
});

// POST /api/subjects
const subjectSchema = Joi.object({
  branch: Joi.string().required().messages({
    'any.required': 'Branch is required',
  }),
  sem: Joi.number().integer().min(1).max(8).required().messages({
    'any.required': 'Semester is required',
  }),
  subjectCode: Joi.string().required().messages({
    'any.required': 'Subject code is required',
  }),
  subjectName: Joi.string().required().messages({
    'any.required': 'Subject name is required',
  }),
  totalModules: Joi.number().integer().min(1).default(5),
  faculty: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().allow(null, ''),
});

// POST /api/syllabus
const syllabusSchema = Joi.object({
  subject: Joi.string().required().messages({
    'any.required': 'Subject is required',
  }),
  date: Joi.date().iso().optional(),
  topicCovered: Joi.string().min(3).required().messages({
    'any.required': 'Topic covered is required',
    'string.min': 'Topic must be at least 3 characters',
  }),
  moduleNo: Joi.number().integer().min(1).required().messages({
    'any.required': 'Module number is required',
  }),
  periodsUsed: Joi.number().integer().min(1).optional(),
});

// POST /api/admin/exam-notices
const examNoticeSchema = Joi.object({
  title: Joi.string().required().messages({
    'any.required': 'Title is required',
  }),
  examType: Joi.string().valid('IA-1', 'IA-2', 'SEE', 'Supplementary', 'Other').optional(),
  branch: Joi.string().required().messages({
    'any.required': 'Branch is required',
  }),
  sem: Joi.number().integer().min(1).max(8).required().messages({
    'any.required': 'Semester is required',
  }),
  subject: Joi.string().optional().allow('', null),
  subjectName: Joi.string().optional().allow('', null),
  date: Joi.date().iso().required().messages({
    'any.required': 'Exam date is required',
    'date.format': 'Date must be a valid ISO date',
  }),
  startTime: Joi.string().optional().allow('', null),
});

// POST /api/events
const eventSchema = Joi.object({
  title: Joi.string().required().messages({
    'any.required': 'Title is required',
  }),
  description: Joi.string().optional().allow(''),
  date: Joi.date().iso().required().messages({
    'any.required': 'Date is required',
    'date.format': 'Date must be a valid ISO date',
  }),
  endDate: Joi.date().iso().optional(),
  branch: Joi.string().optional(),
  eventType: Joi.string().valid('holiday', 'exam', 'event', 'meeting', 'deadline').optional(),
});

// POST /api/grievances
const grievanceSchema = Joi.object({
  category: Joi.string()
    .valid('Academic', 'Fees', 'Hostel', 'Transport', 'Faculty', 'Other')
    .optional(),
  subject: Joi.string().min(3).required().messages({
    'any.required': 'Subject is required',
    'string.min': 'Subject must be at least 3 characters',
  }),
  description: Joi.string().min(10).required().messages({
    'any.required': 'Description is required',
    'string.min': 'Describe the issue in at least 10 characters',
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
  leaveApplySchema,
  leaveDecisionSchema,
  subjectSchema,
  syllabusSchema,
  examNoticeSchema,
  eventSchema,
  grievanceSchema,
};
