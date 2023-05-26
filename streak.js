function guess(socket){
    socket.on('guess', (data) => {
        console.log(data);
        socket.broadcast.emit('guess', data);
    });
}

function streak(socket){
    socket.on('streak', (data) => {
        console.log("Starting new game")
        socket.broadcast.emit('streak', data);
    });
}