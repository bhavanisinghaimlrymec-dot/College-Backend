const Notification = require('../models/Notification');

// Central fan-out helper. NEVER throws — notification failures must not
// break the main request, so every trigger site calls this without await
// or with .catch(() => {}).
// Push delivery (FCM) plugs in here later: pushQueue.push(doc) once
// firebase-admin is configured. Until then, the in-app inbox is the channel.
const notify = async ({ toUser, toRole, branch = 'All', type = 'system', title, body, refId }) => {
  try {
    if (!title) return null;
    const doc = await Notification.create({
      toUser,
      toRole,
      branch,
      type,
      title,
      body,
      refId,
    });
    // TODO(Phase A+): forward to FCM when credentials are configured.
    return doc;
  } catch (error) {
    console.error('notify() failed:', error.message);
    return null;
  }
};

module.exports = { notify };
