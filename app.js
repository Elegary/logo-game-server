const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: {
        origin: '*',
    }
});

const cors = require('cors');

const logos = require('./static/infos.json');

const { v4: uuidv4 } = require('uuid');

let gameStates = {};

// use json body parser
app.use(express.json());

// allow cors from all origins
app.use(cors())

app.use('/api', require('./routes/api'));

app.use('/static/brands', express.static('static/brands'));

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

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('newStreak', (data) => {
        console.log("Starting new game")
        gameStates[socket.id] = {
            currentLogo: getRandomLogo(logos),
            score: 0,
            logosState: logos
        };

        socket.emit('newStreak', {filename: gameStates[socket.id].currentLogo.filename});
        socket.emit('score', gameStates[socket.id].score);

    });

    socket.on('guess', (data) => {
        if(data.trim().toLowerCase() === gameStates[socket.id].currentLogo.name.trim().toLowerCase()){
            socket.emit('correctGuess', data);
            gameStates[socket.id].score += 1;
            gameStates[socket.id].logosState = removeLogoFromList(gameStates[socket.id].currentLogo, gameStates[socket.id].logosState);
            gameStates[socket.id].currentLogo = getRandomLogo(gameStates[socket.id].logosState);
            socket.emit('score', gameStates[socket.id].score);
            socket.emit('newStreak', {filename: gameStates[socket.id].currentLogo.filename});
        }

        else {
            socket.emit('wrongGuess', data);
        }

    });

});

server.listen(3000, () => {
    console.log('listening on *:3000');
});