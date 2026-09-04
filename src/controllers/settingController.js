const AppSetting = require('../models/AppSetting');

// @desc    Public maintenance flag — the app checks this on launch/login
// @route   GET /api/settings/maintenance
// @access  Public
exports.getMaintenance = async (req, res) => {
  try {
    res.json({ enabled: await AppSetting.isMaintenanceOn() });
  } catch (error) {
    res.status(500).json({ message: 'Error reading maintenance status' });
  }
};

// @desc    Enable/disable maintenance mode (locks out students + faculty)
// @route   PATCH /api/admin/settings/maintenance
// @access  Private/Admin
exports.setMaintenance = async (req, res) => {
  try {
    const enabled = await AppSetting.setMaintenance(req.body.enabled);
    res.json({
      enabled,
      message: enabled
        ? 'Maintenance mode enabled. Students and faculty are locked out.'
        : 'Maintenance mode disabled. Everyone can sign in again.',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating maintenance status' });
  }
};
