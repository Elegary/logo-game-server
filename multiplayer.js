const db = require('./db');

const logos = require('./static/infos.json');

const { getMultiplayerGameByCode } = require('./routes/api/games/games_utils');
const { getRoomsByUserId, getCurrentPlayersInGame } = require('./socket_utils');

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

    let game = getMultiplayerGameByCode(data.gameCode);

    if(!game){
        socket.emit('multiplayer-error', {
            message: 'Game not found'
        });
        console.log('[WARNING] User ' + socket.decoded.username + ' tried to join a non-existing game');
        return;
    }

    // check if game is already finished
    if(game.date_finished){
        socket.emit('multiplayer-error', {
            message: 'Game already finished'
        });
        console.log('[WARNING] User ' + socket.decoded.username + ' tried to join a finished game');
        return;
    }

    return game;

}

module.exports = {
    handleMultiplayerGameEvents
}