/* -------------------------------------------------------------------------- */
/*                            server set up                                   */
/* -------------------------------------------------------------------------- */
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io'; //socket io connection for webcam/p5live media
import { WebSocketServer } from 'ws'; //import web socket for arduino connection (adam example)
import path from 'path'; //node js (adam example)
import { fileURLToPath } from 'url'; //node js (adam example)
// import http from 'http';
// import { Server as SocketIOServer } from 'socket.io'; //socket io from gemini

let app = express();
let server = http.createServer(app);
let port = process.env.PORT || 3000;

let __filename = fileURLToPath(import.meta.url); //defining file pathway for the 'import' syntax (adam example)
let __dirname = path.dirname(__filename); //defining file pathway for the 'import' syntax (adam example)


// Serve static files from public folder
app.use(express.static('public'));

// DEFAULT ROUTE - Viewers go here
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

// BROADCAST ROUTE - Only you use this
app.get('/broadcast', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'broadcaster.html'));
});

//create a port variable and listen
server.listen(port, () => {
  console.log('Server listening on port ', port);
});



/* -------------------------------------------------------------------------- */
/*             webRTC socket(with p5 livemedia) example code from             */
/*       https://github.com/vanevery/p5LiveMedia/blob/master/server.js        */
/* -------------------------------------------------------------------------- */

let rooms = {};

// let io = new SocketIOServer(server);
let io = new SocketIOServer(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});


io.sockets.on('connection', function (socket) {
    console.log(Date.now(), socket.id, "New client (Socket.IO)");

    socket.on('room_connect', function(room) {
        console.log(Date.now(), socket.id, room, 'room_connect');
        if (!rooms.hasOwnProperty(room)) {
            console.log(Date.now(), socket.id, "room doesn't exist, creating it");
            rooms[room] = [];
        }
        rooms[room].push(socket);
        socket.room = room;
        
        let ids = [];
        for (let i = 0; i < rooms[socket.room].length; i++) {
            ids.push(rooms[socket.room][i].id);
        }
        console.log(Date.now(), socket.id, "ids length: " + ids.length);
        socket.emit('listresults', ids);
    });

    socket.on('list', function() {
        let ids = [];
        for (let i = 0; i < rooms[socket.room].length; i++) {
            ids.push(rooms[socket.room][i].id);
        }
        console.log(Date.now(), socket.id, "ids length: " + ids.length);
        socket.emit('listresults', ids);			
    });
    
    socket.on('signal', (to, from, data) => {
        let found = false;
        for (let i = 0; i < rooms[socket.room].length; i++) {
            if (rooms[socket.room][i].id == to) {
                rooms[socket.room][i].emit('signal', to, from, data);
                found = true;
                break;
            }				
        }	
    });
            
    socket.on('disconnect', function() {
        console.log(Date.now(), socket.id, "Client has disconnected");
        if (rooms[socket.room]) {
            let which = -1;
            for (let i = 0; i < rooms[socket.room].length; i++) {
                if (rooms[socket.room][i].id != socket.id) {
                    rooms[socket.room][i].emit('peer_disconnect', socket.id);
                } else {
                    which = i;
                }
            }		
            if (which >= 0 && rooms[socket.room][which].id == socket.id) {
                rooms[socket.room].splice(which,1);
            }
        }
    });
});



/* -------------------------------------------------------------------------- */
/*                        web socket for arduino from adam                    */
/* -------------------------------------------------------------------------- */

let wss = new WebSocketServer({ server, path: '/arduino' }); //(claude: different path from socket io)

let clients = new Set(); //a js storage object, similiar to array, but will prevent duplicate data

//brightness control
let serverState = {
  brightness: 128,
};

//helpter function for brodcasting data to clients
function broadcast(data) {
  let message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

wss.on('connection', (ws, req) => { //ws is the connected client
  console.log('New client connected');
  clients.add(ws); //add the connected client to the clients set

  // Send current state to newly connected client
  ws.send(JSON.stringify({
    type: 'initialState',
    state: serverState
  }));

  //add these event listeners to the client
  ws.on('message', (incomingData) => {
    try {
      const data = JSON.parse(incomingData); //incomingData string as json
      console.log('Received:', data); //peek at the incoming data

      // // Example 1: Button toggle
      // if (data.type === 'buttonPress') {
      //   serverState.ledOn = !serverState.ledOn; //toggle the led state
      //   console.log('Button toggled to:', serverState.buttonPressed);
      //   broadcast({ type: 'ledState', value: serverState.ledOn });
      // }

      // Example 2: Slider controls
      if (data.type === 'brightness') {
        serverState.brightness = data.value;
        broadcast({ type: 'brightness', value: data.value });
      }


    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});