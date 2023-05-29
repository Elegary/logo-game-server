const { io } = require('./app');

async function getCurrentPlayersInGame(gameId){
    let clients = io.sockets.adapter.rooms.get(`game-${gameId}`);
    if(clients){
        // convert client to their username and user id
        clients = Array.from(clients).map((clientId) => {
            return {
                username: io.sockets.sockets.get(clientId).decoded.username,
                id: io.sockets.sockets.get(clientId).decoded.id
            }
        });
        return clients;
    }
    return [];
}

async function getRoomsByUserId(userId){
    // user id is in socket.decoded.id therefore we need to search in sockets
    let socketsUsed = [];
    io.sockets.sockets.forEach((socket) => {
        if(socket.decoded.id === userId){
            let rooms = Array.from(socket.rooms);
            let info = {
                socketId: socket.id,
                rooms
            }
            socketsUsed.push(info);
        }
    });
    /*
    // Now we search in rooms with the sockets we found
    let roomsUsed = [];
    let rooms = io.sockets.adapter.rooms;
    socketsUsed.forEach((socket) => {
        rooms.forEach((room) => {
            if(room.has(socket.id)){
                let info = {
                    socketId: socket.id,
                    roomId: room
                }
                roomsUsed.push(info);
            }
        });
    });

    return roomsUsed;
    */
    return socketsUsed;
}


module.exports = {
    getCurrentPlayersInGame,
    getRoomsByUserId
}