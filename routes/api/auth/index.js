const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const db = require('../../../db');

const SALT_WORK_FACTOR = 10;

const router = express.Router();

router.post('/me', (req, res) => {
    if(req.body.token) {
        jwt.verify(req.body.token, 'test', (err, decoded) => {
            if(err) {
                return res.status(401).json({
                    message: 'Token invalide'
                })
            }
            else {
                return res.status(200).json({
                    message: 'Token valide'
                })
            }
        })
    }
    else {
        return res.status(401).json({
            message: 'Token invalide'
        })
    }
});

router.post('/login', (req, res) => {
    if(req.body.username && req.body.password) {
        db.get(`SELECT * FROM users WHERE username = ?`, [req.body.username], (err, row) => {
            if (err) {
                return res.status(500).json({
                    message: 'Erreur interne du serveur'
                })
            }
            if (row) {
                if (bcrypt.compareSync(req.body.password, row.password)) {
                    let token = jwt.sign({ username: row.username }, 'test', { expiresIn: '24h' });
                    return res.status(200).json({
                        message: 'Connexion réussie',
                        token: token
                    })
                }
                else {
                    return res.status(401).json({
                        message: 'Nom d\'utilisateur incorrect ou mot de passe incorrect'
                    })
                }
            }
            else {
                return res.status(401).json({
                    message: 'Nom d\'utilisateur incorrect ou mot de passe incorrect'
                })
            }
        })
    }

    else {
        res.status(400).json({
            message: 'Merci de renseigner un nom d\'utilisateur et un mot de passe!'
        })
    }
});

router.post('/register', (req, res) => {
    // Check if user has posted username and password (no email or other data)
    if (req.body.username && req.body.password) {
        // Check if username already exists in sqlite database
        // rajoute ici !
        db.get(`SELECT * FROM users WHERE username = ?`, [req.body.username], (err, row) => {
            if (err) {
                return res.status(500).json({
                    message: 'Erreur interne du serveur'
                })
            }
            // If username already exists, return error
            if (row) {
                return res.status(401).json({
                    message: 'Ce nom d\'utilisateur est déjà pris'
                })
            }

            else {
                if(req.body.password.length < 4) {
                    return res.status(401).json({
                        message: 'Le mot de passe doit contenir au moins 4 caractères'
                    })
                }

                else {
                    // If username does not exist, create user in sqlite database
                    const passwordHash = bcrypt.hashSync(req.body.password, SALT_WORK_FACTOR);
                    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [req.body.username, passwordHash], (err) => {
                        if (err) {
                            return res.status(500).json({
                                message: 'Erreur interne du serveur'
                            })
                        }
                        // If user created successfully, return success message
                        return res.status(200).json({
                            message: 'Utilisateur créé avec succès'
                        })
                    })
                }
            }

        })
    }
    
    else {
        res.status(401).json({
            message: 'Merci de renseigner un nom d\'utilisateur et un mot de passe!'
        })
    }
});

module.exports = router;