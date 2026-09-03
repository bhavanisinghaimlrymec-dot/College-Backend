const Event = require('../models/Event');
const ROLES = require('../constants/roles');
const { notify } = require('../utils/notify');

const midnight = (d) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

const toSummary = (e) => ({
  id: e._id,
  title: e.title,
  description: e.description,
  date: e.date,
  endDate: e.endDate,
  branch: e.branch,
  eventType: e.eventType,
});

// @desc    List calendar events (?branch=&from=&to= ISO dates)
//   Regular users see 'All' + own branch. Admin/Principal see all (or ?branch=).
// @route   GET /api/events
// @access  Private (all roles)
exports.listEvents = async (req, res) => {
  try {
    const filter = {};
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = midnight(req.query.from);
      if (req.query.to) filter.date.$lte = midnight(req.query.to);
    }
    if ([ROLES.ADMIN, ROLES.PRINCIPAL].includes(req.user.role)) {
      if (req.query.branch) filter.branch = req.query.branch;
    } else {
      filter.branch = { $in: ['All', req.user.branch] };
    }
    const events = await Event.find(filter).sort({ date: 1 }).limit(500);
    res.json(events.map(toSummary));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events' });
  }
};

// @desc    Create a calendar event (notifies the branch)
// @route   POST /api/events
// @access  Private/Admin, Principal
exports.createEvent = async (req, res) => {
  const { title, description, date, endDate, branch, eventType } = req.body;
  try {
    const event = await Event.create({
      title,
      description: description || '',
      date: midnight(date),
      endDate: endDate ? midnight(endDate) : undefined,
      branch: (branch || 'All').trim() || 'All',
      eventType: eventType || 'event',
      createdBy: req.user._id,
    });

    notify({
      toRole: 'all',
      branch: event.branch,
      type: 'system',
      title: `Calendar: ${event.title}`,
      body: `${new Date(event.date).toDateString()}${event.branch !== 'All' ? ` • ${event.branch}` : ''}`,
      refId: event._id,
    });

    res.status(201).json(toSummary(event));
  } catch (error) {
    res.status(500).json({ message: 'Error creating event' });
  }
};

// @desc    Update a calendar event
// @route   PUT /api/events/:id
// @access  Private/Admin, Principal
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    ['title', 'description', 'branch', 'eventType'].forEach((k) => {
      if (req.body[k] !== undefined) event[k] = req.body[k];
    });
    if (req.body.date) event.date = midnight(req.body.date);
    if (req.body.endDate !== undefined) {
      event.endDate = req.body.endDate ? midnight(req.body.endDate) : undefined;
    }
    await event.save();
    res.json(toSummary(event));
  } catch (error) {
    res.status(500).json({ message: 'Error updating event' });
  }
};

// @desc    Delete a calendar event
// @route   DELETE /api/events/:id
// @access  Private/Admin, Principal
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    await event.deleteOne();
    res.json({ message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting event' });
  }
};
