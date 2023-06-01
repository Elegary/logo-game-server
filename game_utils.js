const db = require('./db');

const logos = require('./static/infos.json');
const categories_data = require('./static/categories.json');

async function getPlayerBestScoreForCategory(playerId, categoryId){
    const score = await new Promise((resolve, reject) => {
        db.get(`SELECT MAX(score) AS maxScore FROM streak WHERE user_id = ? AND category_id = ?`, [playerId, categoryId], (err, row) => {
            if(err){
                console.log(err);
                reject(err);
            }
            else {
                resolve(row.maxScore);
            }
        });
    });
    return score;
}

async function insertPlayerScoreForCaterogy(playerId, categoryId, score){
    const result = await new Promise((resolve, reject) => {
        db.run(`INSERT INTO streak (user_id, category_id, score) VALUES (?, ?, ?)`, [playerId, categoryId, score], (err) => {
            if(err){
                console.log(err);
                reject(err);
            }
            else {
                resolve(true);
            }
        });
    });
    return result;
}

function getRandomLogo(logosState){
    let logo = logosState[Math.floor(Math.random() * logosState.length)];
    console.log(logo.name)
    return logo;
}

function removeLogoFromList(logo, logosState){
    //console.log(logosState.length + " logos left")
    //console.log(logosState)
    logosState = logosState.filter((item) => {
        return item !== logo;
    });
    //console.log(logosState)
    console.log(logosState.length + " logos left")
    return logosState;
}

module.exports = {
    getRandomLogo,
    removeLogoFromList,
    getPlayerBestScoreForCategory,
    insertPlayerScoreForCaterogy,
    logos,
    categories_data
}