const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  const { usn, password } = req.body;
  try {
    const user = await User.findOne({ usn });
    if (user && user.isActive === false) {
      return res.status(403).json({ message: 'This account has been suspended. Please contact the administrator.' });
    }
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        usn: user.usn,
        email: user.email,
        role: user.role,
        branch: user.branch,
        sem: user.sem,
        isActive: user.isActive,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid Credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Change logged-in user's password
// @route   POST /api/auth/change-password
// @access  Private (requires Bearer token)
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    // NOTE: must use .save() (not findByIdAndUpdate) so the
    // pre('save') hook re-hashes the new password via bcrypt.
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error changing password' });
  }
};

// @desc    Get logged-in user's profile
// @route   GET /api/auth/profile
// @access  Private (requires Bearer token)
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      _id: user._id,
      name: user.name,
      usn: user.usn,
      email: user.email,
      role: user.role,
      branch: user.branch,
      sem: user.sem,
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
};
