const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db.sqlite');

// check if tables exists and if not, create them
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS streak (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
    // create table for managing multiplayer games (should include : id, date_created, date_started, date_finished, category_id, creator_id, winner_id, game_code)
    db.run(`CREATE TABLE IF NOT EXISTS multiplayer_games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
        date_started DATETIME,
        date_finished DATETIME,
        category_id INTEGER NOT NULL,
        creator_id INTEGER NOT NULL,
        winner_id INTEGER,
        game_code TEXT NOT NULL,
        FOREIGN KEY (creator_id) REFERENCES users(id),
        FOREIGN KEY (winner_id) REFERENCES users(id)
    )`);
});

module.exports = db;