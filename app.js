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

// make io accessible from anywhere
module.exports = {
    io
}

const cors = require('cors');
const jwt = require('jsonwebtoken');

const db = require('./db');

const { v4: uuidv4 } = require('uuid');

const handleStreakGameEvents = require('./streak');
const { handleMultiplayerGameEvents } = require('./multiplayer');

// use json body parser
app.use(express.json());

// allow cors from all origins
app.use(cors())

app.use('/api', require('./routes/api'));

app.use('/static/brands', express.static('static/brands'));


io.use(function(socket, next){
    if (socket.handshake.query && socket.handshake.query.token){
      jwt.verify(socket.handshake.query.token, 'test', function(err, decoded) {
        if (err){
            console.log("[WARNING] Potential hacking attempt: " + socket.handshake.query.token);
            return next(new Error('Authentication error'));
        } else {
            console.log("[INFO] User connected: " + decoded.username);
            socket.decoded = decoded;
            next();
        }
      });
    }
    else {
        // log ip address
        console.log("[WARNING] Potential hacking attempt tried to login without token: " + socket.handshake.address);
        next(new Error('Authentication error'));
    }    
  })
  .on('connection', function(socket) {
        // Connection now authenticated to receive further events
        handleStreakGameEvents(socket);
        handleMultiplayerGameEvents(socket);
  });

server.listen(3000, () => {
    console.log('listening on *:3000');
});