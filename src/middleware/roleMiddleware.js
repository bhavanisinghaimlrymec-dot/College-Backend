const authorize = (...roles) => {
  return (req, res, next) => {
    // If the user's role is not in the allowed roles list, block them
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Role (${req.user.role}) is not authorized to access this resource` 
      });
    }
    next();
  };
};

module.exports = { authorize };