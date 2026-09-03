const TimetableSlot = require('../models/TimetableSlot');

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Shared overlap guard: two intervals [a,b) and [c,d) overlap iff a < d && b > c.
const hasOverlap = (candidate, slots) =>
  slots.some(
    (s) =>
      s.day === candidate.day &&
      toMinutes(candidate.startTime) < toMinutes(s.endTime) &&
      toMinutes(candidate.endTime) > toMinutes(s.startTime)
  );

// @desc    Get logged-in faculty's timetable slots
// @route   GET /api/timetable
// @access  Private/Faculty (Admin can pass ?facultyId to inspect)
exports.getSlots = async (req, res) => {
  try {
    const facultyId = req.user.role === 'admin' && req.query.facultyId
      ? req.query.facultyId
      : req.user._id;
    const slots = await TimetableSlot.find({ faculty: facultyId }).sort({ day: 1, startTime: 1 });
    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching timetable' });
  }
};

// @desc    Create a timetable slot
// @route   POST /api/timetable
// @access  Private/Faculty (Admin on behalf via facultyId body field)
exports.createSlot = async (req, res) => {
  const { day, startTime, endTime, subject, branch, room, facultyId } = req.body;
  try {
    if (toMinutes(startTime) >= toMinutes(endTime)) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }
    const owner = req.user.role === 'admin' && facultyId ? facultyId : req.user._id;
    const existing = await TimetableSlot.find({ faculty: owner, day });
    if (hasOverlap({ day, startTime, endTime }, existing)) {
      return res.status(409).json({ message: 'Time conflict: this slot overlaps an existing slot on ' + day });
    }
    const slot = await TimetableSlot.create({
      faculty: owner,
      day,
      startTime,
      endTime,
      subject,
      branch: branch || '',
      room: room || '',
    });
    res.status(201).json(slot);
  } catch (error) {
    res.status(500).json({ message: 'Error creating timetable slot' });
  }
};

// @desc    Update a timetable slot
// @route   PUT /api/timetable/:id
// @access  Private/Owner faculty (Admin any)
exports.updateSlot = async (req, res) => {
  try {
    const slot = await TimetableSlot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ message: 'Timetable slot not found' });
    }
    if (req.user.role !== 'admin' && slot.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only update your own timetable slots' });
    }
    const next = {
      day: req.body.day ?? slot.day,
      startTime: req.body.startTime ?? slot.startTime,
      endTime: req.body.endTime ?? slot.endTime,
    };
    if (toMinutes(next.startTime) >= toMinutes(next.endTime)) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }
    const siblings = await TimetableSlot.find({
      faculty: slot.faculty,
      day: next.day,
      _id: { $ne: slot._id },
    });
    if (hasOverlap(next, siblings)) {
      return res.status(409).json({ message: 'Time conflict: this slot overlaps an existing slot on ' + next.day });
    }
    slot.day = next.day;
    slot.startTime = next.startTime;
    slot.endTime = next.endTime;
    if (req.body.subject !== undefined) slot.subject = req.body.subject;
    if (req.body.branch !== undefined) slot.branch = req.body.branch;
    if (req.body.room !== undefined) slot.room = req.body.room;
    await slot.save();
    res.json(slot);
  } catch (error) {
    res.status(500).json({ message: 'Error updating timetable slot' });
  }
};

// @desc    Delete a timetable slot
// @route   DELETE /api/timetable/:id
// @access  Private/Owner faculty (Admin any)
exports.deleteSlot = async (req, res) => {
  try {
    const slot = await TimetableSlot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ message: 'Timetable slot not found' });
    }
    if (req.user.role !== 'admin' && slot.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own timetable slots' });
    }
    await slot.deleteOne();
    res.json({ message: 'Timetable slot deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting timetable slot' });
  }
};
