const mongoose = require('mongoose');
const Notification = require('../models/Notification');

// Audience filter shared by inbox + unread count: own personal items,
// global broadcasts, and role-wide items scoped to the user's branch.
const audienceFilter = (user) => ({
  $or: [
    { toUser: user._id },
    { toRole: 'all', branch: { $in: ['All', user.branch] } },
    { toRole: user.role, branch: { $in: ['All', user.branch] } },
  ],
});

// @desc    Get logged-in user's notification inbox (newest first)
// @route   GET /api/notifications
// @access  Private (all roles)
exports.getMine = async (req, res) => {
  try {
    const wantsPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const filter = audienceFilter(req.user);
    if (!wantsPagination) {
      const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
      return res.json(items);
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const [total, unread, items] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, isRead: false }),
      Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ]);
    res.json({
      data: items,
      page,
      limit,
      total,
      unread,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

// @desc    Unread count for the bell badge
// @route   GET /api/notifications/unread-count
// @access  Private (all roles)
exports.getUnreadCount = async (req, res) => {
  try {
    const unread = await Notification.countDocuments({
      ...audienceFilter(req.user),
      isRead: false,
    });
    res.json({ unread });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching unread count' });
  }
};

// @desc    Mark one notification as read (own inbox only)
// @route   PATCH /api/notifications/:id/read
// @access  Private (all roles)
exports.markRead = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid notification id' });
    }
    const item = await Notification.findOne({
      _id: req.params.id,
      ...audienceFilter(req.user),
    });
    if (!item) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    if (item.toUser && item.toUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your notification' });
    }
    item.isRead = true;
    await item.save();
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification' });
  }
};

// @desc    Mark the whole inbox as read
// @route   PATCH /api/notifications/read-all
// @access  Private (all roles)
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { ...audienceFilter(req.user), isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications' });
  }
};
