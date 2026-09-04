const express = require('express');
const router = express.Router();
const { getMaintenance } = require('../controllers/settingController');

// Public — checked by the app on launch, before login.
router.get('/maintenance', getMaintenance);

module.exports = router;
