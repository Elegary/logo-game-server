const express = require('express');
const app = express();
const http = require('http');

const { Server } = require('socket.io');

require('dotenv').config();

let httpServer;
// use https if in production
if(process.env.NODE_ENV === 'production'){
    const fs = require('fs');
    const https = require('https');
    const privateKey = fs.readFileSync('./certs/private.key', 'utf8');
    const certificate = fs.readFileSync('./certs/certificate.crt', 'utf8');
    const ca = fs.readFileSync('./certs/ca_bundle.crt', 'utf8');
    const credentials = {
        key: privateKey,
        cert: certificate,
        ca: ca
    };
    console.log("[INFO] Running in production mode");
    httpServer = https.createServer(credentials, app);
} else {
    httpServer = http.createServer(app);
}

const io = new Server(httpServer, {
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
      jwt.verify(socket.handshake.query.token, process.env.JWT_SECRET, function(err, decoded) {
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

httpServer.listen(process.env.PORT || 3000, () => {
    console.log(`Server listening on port ${process.env.PORT || 3000}`);
});