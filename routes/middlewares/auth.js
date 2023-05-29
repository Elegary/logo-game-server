// Middleware to check if user is authenticated 
// If user is authenticated, continue to next middleware
// If user is not authenticated, return 401 error

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    if (req.headers.authorization) {
        let token = req.headers.authorization.split(' ')[1];
        jwt.verify(token, 'test', (err, decoded) => {
            if (err) {
                return res.status(401).json({
                    message: 'Token invalide'
                })
            }
            else {
                req.user = decoded;
                next();
            }
        })
    }
    else {
        return res.status(401).json({
            message: 'Token invalide'
        })
    }
}

module.exports = authMiddleware;