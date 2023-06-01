const db = require('./db');

const logos = require('./static/infos.json');

const { getMultiplayerGameByCode, setGameStarted, setGameFinished, setGameWinner } = require('./routes/api/games/games_utils');
const { getRoomsByUserId, getCurrentPlayersInGame } = require('./socket_utils');
const { getRandomLogo, removeLogoFromList } = require('./game_utils');

const io = require('./app').io;

let gameStates = {};

async function handleMultiplayerGameEvents(socket){
    
    socket.on('multiplayer-join', async (data) => {
        console.log("[INFO] User " + socket.decoded.username + " wants to join a multiplayer game");

        let game = await checkGameCode(socket, data);
        if(!game){
            console.log('[WARNING] User ' + socket.decoded.username + ' is not allowed to join the game');
            return;
        }

        // Init the game state if not already done
        if(!gameStates[game.id]){
            // currentLogo will be set when the game is started
            gameStates[game.id] = {
                currentLogo: null,
                scores: {},
                logosState: logos,
                lastGuesses: {},
                currentCategory: game.category_id,
                started: game.date_started ? true : false
            };
        }

        // set score to 0 for the joining player if not already set
        if(!gameStates[game.id].scores[socket.decoded.id]){
            gameStates[game.id].scores[socket.decoded.id] = {username: socket.decoded.username, score: 0}
        }

        await registerGameTchatPlayersInteractions(socket, game);

        // update started state
        gameStates[game.id].started = game.date_started ? true : false;

        socket.on('multiplayer-start-game', async (data) => {
            if(socket.decoded.id !== game.creator_id){
                socket.emit('multiplayer-error', {
                    message: 'You are not the creator of this game'
                });
                console.log('[WARNING] User ' + socket.decoded.username + ' tried to start a game without being the creator');
                return;
            } else {
                if(game.date_started){
                    socket.emit('multiplayer-error', {
                        message: 'Game already started'
                    });
                    console.log('[WARNING] User ' + socket.decoded.username + ' tried to start a game that was already started');
                    return;
                }
    
                await setGameStarted(game.id);
                io.to(`game-${game.id}`).emit('multiplayer-game-started', {
                    message: 'Game started',
                    game,
                    time: Date.now()
                });
                io.to(`game-${game.id}`).emit('multiplayer-scores', {
                    scores: gameStates[game.id].scores,
                    time: Date.now()
                });
                console.log('[INFO] Game #' + game.game_code + ' started by ' + socket.decoded.username);

                // go to next logo every 10 seconds
                changeLogo(game);
                setTimeout(() => {
                    // reveal the logo after 10 seconds
                    revealLogo(game);
                }, 10000);

                let interval = setInterval(() => {
                    if(gameStates[game.id].logosState.length > 0){
                        console.log(gameStates[game.id].logosState.length + ' AAA logos left')
                       changeLogo(game);
                        setTimeout(() => {
                            // reveal the logo after 10 seconds
                            revealLogo(game);
                        }, 10000);
                    }
                    else {
                        clearInterval(interval);
                        io.to(`game-${game.id}`).emit('multiplayer-game-finished', {
                            message: 'Game finished',
                            game,
                            time: Date.now()
                        });
                        console.log('[INFO] Game #' + game.game_code + ' finished');
                        setGameFinished(game.id);
                        // Choose the winner
                        let winner = null;
                        let maxScore = 0;
                        // TODO
                        // if two players have the same score, the winner will be choosen randomly (to be done)
                        for(let player in gameStates[game.id].scores){
                            if(gameStates[game.id].scores[player].score > maxScore){
                                winner = gameStates[game.id].scores[player];
                                winner.id = player;
                                maxScore = gameStates[game.id].scores[player].score;
                            }
                        }
                        // if no winner, set 0 as winner
                        if(!winner){
                            winner = {username: 'No winner', score: 0};
                            setGameWinner(game.id, 0);
                        } else {
                            // set winner in database
                            console.log(winner);
                            setGameWinner(game.id, winner.id);
                        }

                        io.to(`game-${game.id}`).emit('multiplayer-winner', {
                            message: 'Winner',
                            winner: {
                                username: winner.username,
                                id: winner.id,
                                score: winner.score
                            },
                            time: Date.now()
                        });

                        console.log('[INFO] Winner of game #' + game.game_code + ' is ' + winner.username + ' with a score of ' + winner.score);
                        
                    }
                }, 15000);


            }
        });

        socket.on('multiplayer-guess', async (data) => {
            if(!data.guess){
                return;
            }
            if(data.guess.trim().toLowerCase() === gameStates[game.id].currentLogo.name.trim().toLowerCase()){
                // check if time is not over before sending the correct guess
                if(Date.now() < gameStates[game.id].currentLogo.expirationDate){
                    if(!(gameStates[game.id].lastGuesses[socket.decoded.id] && gameStates[game.id].lastGuesses[socket.decoded.id] === gameStates[game.id].currentLogo.name)){
                        socket.emit('multiplayer-correct-guess', data);
                        gameStates[game.id].scores[socket.decoded.id].score += 100;
                        gameStates[game.id].lastGuesses[socket.decoded.id] = gameStates[game.id].currentLogo.name;
                        console.log(gameStates[game.id].scores)
                        io.to(`game-${game.id}`).emit('multiplayer-scores', {
                            scores: gameStates[game.id].scores,
                            time: Date.now()
                        });
                        io.to(`game-${game.id}`).emit('multiplayer-guess-event', {
                            player: {
                                username: socket.decoded.username,
                                id: socket.decoded.id
                            },
                            time: Date.now()
                        });
                    } 
                    
                    else {
                        console.log('[WARNING] Potential cheating from ' + socket.decoded.username + ' (tried to guess the same logo twice)');
                        socket.emit('multiplayer-error', {
                            message: 'You are not allowed to guess the same logo twice'
                        });
                    }
                }

                else {
                    console.log('[WARNING] Potential cheating from ' + socket.decoded.username + ' (tried to guess after the logo was revealed)');
                    socket.emit('multiplayer-error', {
                        message: 'You are not allowed to guess after the logo was revealed'
                    });
                }

            }
        });

        console.log(gameStates[game.id])

        // if player join after the game has started, send him the current logo
        if(gameStates[game.id].started){
            //console.log('[INFO] Sending current logo to ' + socket.decoded.username);
            if(gameStates[game.id].currentLogo){
                socket.emit('multiplayer-new-logo', {
                    filename: gameStates[game.id].currentLogo.filename,
                    expirationDate: gameStates[game.id].currentLogo.expirationDate,
                    time: Date.now()
                });
            }
            socket.emit('multiplayer-scores', {
                scores: gameStates[game.id].scores,
                time: Date.now()
            });
        }


    });
}

async function registerGameTchatPlayersInteractions(socket, game) {
    // Disconnect user from any other game
    let rooms = await getRoomsByUserId(socket.decoded.id);
    //console.log(rooms);
    //console.log(game);

    socket.join(`game-${game.id}`);
    socket.emit('multiplayer-joined', {
        message: 'Joined game',
        game
    });
    console.log('[INFO] User ' + socket.decoded.username + ' joined game #' + game.game_code + ' (ID : ' + game.id + ')');

    // send message to other players
    io.to(`game-${game.id}`).emit('multiplayer-player-joined', {
        message: 'Player joined',
        player: {
            username: socket.decoded.username,
            id: socket.decoded.id
        },
        playersCount: (await getCurrentPlayersInGame(game.id)).length,
        time: Date.now()
    });

    io.to(`game-${game.id}`).emit('multiplayer-scores', {
        scores: gameStates[game.id].scores,
        time: Date.now()
    });
    

    socket.on(`tchat-message`, (data) => {
        if(!data.message){
            return;
        }
        console.log('Message from ' + socket.decoded.username + ' : ' + data.message);
        io.to(`game-${game.id}`).emit('tchat-message', {
            message: data.message,
            player: {
                username: socket.decoded.username,
                id: socket.decoded.id
            },
            time: Date.now()
        });
    });

    socket.on('disconnect', async () => {
        console.log('[INFO] User ' + socket.decoded.username + ' disconnected');
        io.to(`game-${game.id}`).emit('multiplayer-player-left', {
            message: 'Player left',
            player: {
                username: socket.decoded.username,
                id: socket.decoded.id
            },
            playersCount: (await getCurrentPlayersInGame(game.id)).length,
            time: Date.now()
        });
    });
}

async function checkGameCode(socket, data){
    if(!data.gameCode){
        socket.emit('multiplayer-error', {
            message: 'No game code provided'
        });
        console.log('[WARNING] User ' + socket.decoded.username + ' tried to join a game without a game code');
        return;
    }

    // check if game code is the right format (4 Capital letters)
    if(!data.gameCode.match(/^[A-Z]{4}$/)){
        socket.emit('multiplayer-error', {
            message: 'Invalid game code'
        });
        console.log('[WARNING] User ' + socket.decoded.username + ' tried to join a game with an invalid game code');
        return;
    }

    let game = await getMultiplayerGameByCode(data.gameCode);

    if(!game){
        socket.emit('multiplayer-error', {
            message: 'Game not found'
        });
        console.log('[WARNING] User ' + socket.decoded.username + ' tried to join a non-existing game');
        return;
    }

    if(game.date_finished){
        socket.emit('multiplayer-error', {
            message: 'Game already finished'
        });
        console.log('[WARNING] User ' + socket.decoded.username + ' tried to join a finished game');
        return;
    }

    return game;

}

async function changeLogo(game){
    gameStates[game.id].currentLogo = getRandomLogo(gameStates[game.id].logosState);
    // Add expiration date to the logo in now + 10 seconds
    gameStates[game.id].currentLogo.expirationDate = Date.now() + 10000;
    console.log('[INFO] New logo: ' + gameStates[game.id].currentLogo.name + ' (' + gameStates[game.id].currentLogo.filename + ')');
    io.to(`game-${game.id}`).emit('multiplayer-new-logo', {
        filename: gameStates[game.id].currentLogo.filename,
        time: Date.now(),
        expirationDate: gameStates[game.id].currentLogo.expirationDate
    });

    // remove logo from list
    gameStates[game.id].logosState = removeLogoFromList(gameStates[game.id].currentLogo, gameStates[game.id].logosState);


}


function revealLogo(game){
    io.to(`game-${game.id}`).emit('multiplayer-logo-reveal', {
        message: 'Logo revealed',
        name: gameStates[game.id].currentLogo.name,
        time: Date.now()
    });
}

module.exports = {
    handleMultiplayerGameEvents
}