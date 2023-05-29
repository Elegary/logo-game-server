const express = require('express');

const authMiddleware = require('../middlewares/auth');

const router = express.Router();

router.get('/', (req, res) => {
    res.json({
        message: 'API Logo Games welcomes you 😎'
    })
});

router.use('/auth', require('./auth'));

// Use auth middleware for games route
router.use('/games', authMiddleware, require('./games'));

module.exports = router;