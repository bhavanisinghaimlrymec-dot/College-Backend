const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.login = async (req, res) => {
  const { usn, password } = req.body;
  try {
    const user = await User.findOne({ usn });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        usn: user.usn,
        role: user.role,
        branch: user.branch,
        sem: user.sem,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid Credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};