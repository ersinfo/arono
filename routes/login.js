const express = require('express');
const path = require('path');
const router = express.Router();

// Index page route
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

module.exports = router;
