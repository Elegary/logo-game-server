const db = require('./db');
const { getRandomLogo, logos, removeLogoFromList, getPlayerBestScoreForCategory, insertPlayerScoreForCaterogy }= require('./game_utils');

let gameStates = {};

module.exports = async function handleStreakGameEvents(socket){
    
    socket.on('newStreak', async (data) => {
        console.log("[INFO] New streak game started for user " + socket.decoded.username);
        let bestScore = await getPlayerBestScoreForCategory(socket.decoded.id, 1);
        gameStates[socket.decoded.id] = {
            currentLogo: getRandomLogo(logos),
            score: 0,
            logosState: logos,
            currentCategory: 1,
            bestScore
        };
        console.log('Best score: ' + gameStates[socket.decoded.id].bestScore);
        socket.emit('newStreak', {filename: gameStates[socket.decoded.id].currentLogo.filename});
        socket.emit('streak-score', {
            score: gameStates[socket.decoded.id].score,
            bestScore: gameStates[socket.decoded.id].bestScore
        });

    });
    
    socket.on('streak-guess', async (data) => {
        if(!gameStates[socket.decoded.id]){
            console.log('[WARNING] User ' + socket.decoded.username + ' tried to guess without a game started');
            return;
        }
        if(data.trim().toLowerCase() === gameStates[socket.decoded.id].currentLogo.name.trim().toLowerCase()){
            socket.emit('correctGuess', data);
            gameStates[socket.decoded.id].score += 1;
            gameStates[socket.decoded.id].logosState = removeLogoFromList(gameStates[socket.decoded.id].currentLogo, gameStates[socket.decoded.id].logosState);
            gameStates[socket.decoded.id].currentLogo = getRandomLogo(gameStates[socket.decoded.id].logosState);

            // update best score
            if(gameStates[socket.decoded.id].score > gameStates[socket.decoded.id].bestScore){
                gameStates[socket.decoded.id].bestScore = gameStates[socket.decoded.id].score;
            }

            socket.emit('streak-score', {
                score: gameStates[socket.decoded.id].score,
                bestScore: gameStates[socket.decoded.id].bestScore
            });
            socket.emit('newStreak', {filename: gameStates[socket.decoded.id].currentLogo.filename});
        }

        else {
            socket.emit('streak-wrongGuess', data);
            // insert highscore into streak table
            await insertPlayerScoreForCaterogy(socket.decoded.id, 1, gameStates[socket.decoded.id].score);
        }

    });

}