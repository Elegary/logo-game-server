const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    res.json({
        message: 'API Logo Games welcomes you 😎'
    })
});

router.use('/auth', require('./auth'));

module.exports = router;