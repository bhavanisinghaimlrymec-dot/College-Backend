const User = require('../models/User');
const ROLES = require('../constants/roles');

// @desc    Register a new user (Student or Faculty)
// @route   POST /api/admin/add-user
// @access  Private/Admin
exports.addUser = async (req, res) => {
  const { name, usn, email, password, role, branch, sem } = req.body;

  try {
    const userExists = await User.findOne({ usn });

    if (userExists) {
      return res.status(400).json({ message: 'User with this ID already exists' });
    }

    const user = await User.create({
      name,
      usn,
      email,
      password,
      role,
      branch,
      sem: role === ROLES.STUDENT ? sem : undefined,
    });

    if (user) {
      res.status(201).json({
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} added successfully`,
        user: { id: user._id, name: user.name, usn: user.usn }
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error while adding user' });
  }
};

// @desc    Promote all students in a branch to next semester
// @route   POST /api/admin/promote
// @access  Private/Admin
exports.promoteSemester = async (req, res) => {
  const { branch, currentSem } = req.body;

  try {
    const result = await User.updateMany(
      { role: ROLES.STUDENT, branch: branch, sem: currentSem },
      { $inc: { sem: 1 } }
    );

    res.json({ message: `Successfully promoted ${result.modifiedCount} students.` });
  } catch (error) {
    res.status(500).json({ message: 'Error during semester promotion' });
  }
};

// --- STEP 3: Admin User Management Endpoints ---

// @desc    Get all users (with optional role/branch filters)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.branch) filter.branch = req.query.branch;

    const users = await User.find(filter)
      .select('name usn email role branch sem')
      .sort({ createdAt: -1 });

    // Map _id to id for cleaner API response
    const result = users.map((u) => ({
      id: u._id,
      name: u.name,
      usn: u.usn,
      email: u.email,
      role: u.role,
      branch: u.branch,
      sem: u.sem,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// @desc    Delete a user by ID
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.deleteOne();
    res.json({ message: `User ${user.name} (${user.usn}) deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
};