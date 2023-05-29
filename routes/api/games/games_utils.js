const db = require('../../../db');

// Game code is formated as follows: 4 capital letters
function generateGameCode(){
    let code = '';
    for(let i = 0; i < 4; i++){
        code += String.fromCharCode(Math.floor(Math.random() * 26) + 65);
    }
    return code;
}

// Games active dont have a date_finished value
async function getActiveMultiplayerGames(){
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM multiplayer_games WHERE date_finished IS NULL`, (err, rows) => {
            if(err){
                reject(err);
            }
            resolve(rows);
        });
    });
}

async function getMultiplayerGameByCode(gameCode){
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM multiplayer_games WHERE game_code = ?`, [gameCode], (err, row) => {
            if(err){
                reject(err);
            }
            resolve(row);
        });
    });
}

async function checkIfGameCodeExists(gameCode){
    return new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) AS count FROM multiplayer_games WHERE game_code = ?`, [gameCode], (err, row) => {
            if(err){
                reject(err);
            }
            resolve(row.count > 0);
        });
    });
}

/**
 * 
 * @param {*} creatorId 
 * @param {*} categoryId 
 * @param {*} gameCode 
 * @returns 
 */
async function insertGame(creatorId, categoryId, gameCode){
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO multiplayer_games (creator_id, category_id, game_code) VALUES (?, ?, ?)`, [creatorId, categoryId, gameCode], (err) => {
            if(err){
                reject(err);
            }
            resolve(true);
        });
    });
}

async function getBestScoresForCategory(categoryId){
    return new Promise((resolve, reject) => {
        db.all(`SELECT streak.score, users.username FROM streak INNER JOIN users ON streak.user_id = users.id WHERE streak.category_id = ? ORDER BY streak.score DESC LIMIT 20`, [categoryId], (err, rows) => {
            if(err){
                console.log(err);
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
}


module.exports = {
    generateGameCode,
    getActiveMultiplayerGames,
    getMultiplayerGameByCode,
    checkIfGameCodeExists,
    getBestScoresForCategory,
    insertGame
}