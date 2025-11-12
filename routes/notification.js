const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

router.get('/', async (req, res) => {
  const userId = req.headers['x-user-id'] || (req.user && req.user._id);
  if (!userId) return res.status(401).json({ error: 'Login required' });

  const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 }).lean();
  res.json(notifications);
});

router.post('/:id/read', async (req, res) => {
  const notif = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
  res.json(notif);
});

module.exports = router;
