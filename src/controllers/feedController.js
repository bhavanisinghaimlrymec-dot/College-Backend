const FeedPost = require('../models/FeedPost');
const ROLES = require('../constants/roles');

// @desc    Create a new post
// @route   POST /api/feed/create
// @access  Private
exports.createPost = async (req, res) => {
  const { title, content, branchTag, isImportant, hasAttachment, attachmentUrl } = req.body;

  try {
    const post = await FeedPost.create({
      title,
      content,
      author: req.user._id,
      authorName: req.user.name,
      authorRole: req.user.role,
      branchTag: branchTag || 'All',
      isImportant,
      hasAttachment,
      attachmentUrl
    });

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error creating post' });
  }
};

// @desc    Get all posts (filtered by branch)
// @route   GET /api/feed
// @access  Private
exports.getPosts = async (req, res) => {
  try {
    // Show posts for their specific branch OR posts tagged for 'All'
    const posts = await FeedPost.find({
      $or: [
        { branchTag: 'All' },
        { branchTag: req.user.branch }
      ]
    }).sort({ createdAt: -1 }); // Newest first

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching feed' });
  }
};

// @desc    Delete a post
// @route   DELETE /api/feed/:id
// @access  Private
exports.deletePost = async (req, res) => {
  try {
    const post = await FeedPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Permission Check: Admin can delete any post. Others only their own.
    if (req.user.role !== ROLES.ADMIN && post.author.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized to delete this post' });
    }

    await post.deleteOne();
    res.json({ message: 'Post removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting post' });
  }
};
// @desc    Create a Global Broadcast (Admin Only)
// @route   POST /api/feed/broadcast
exports.createBroadcast = async (req, res) => {
  const { title, content, isImportant } = req.body;

  try {
    const broadcast = await FeedPost.create({
      title,
      content,
      author: req.user._id,
      authorName: "SYSTEM ADMIN",
      authorRole: "admin",
      branchTag: "All", // Forces it to be visible to everyone
      isImportant: true, // Broadcasts are usually important
    });

    res.status(201).json(broadcast);
  } catch (error) {
    res.status(500).json({ message: 'Error creating broadcast' });
  }
};