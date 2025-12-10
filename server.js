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
/*         webRTC socket io (with p5 livemedia) example code from             */
/*       https://github.com/vanevery/p5LiveMedia/blob/master/server.js        */
/* -------------------------------------------------------------------------- */

let rooms = {};
let broadcasters = {}; // Track broadcaster ID per room

let io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

/* --------------------------------------------------------------------- */
/*                server side ON socket connection                       */
/* --------------------------------------------------------------------- */
//socket io ON connections 
io.sockets.on('connection', function (socket) {
  console.log(Date.now(), socket.id, "New client (Socket.IO)");

  socket.isBroadcaster = false; // Default is viewer
  socket.userName = null; //Store user's name when they input

  // Listen for broadcaster identification
  socket.on('identify_broadcaster', function () {
    console.log(Date.now(), socket.id, "🔴 IDENTIFIED AS BROADCASTER");
    socket.isBroadcaster = true;
    if (socket.room) {
      broadcasters[socket.room] = socket.id;
    }
  });

  socket.on('room_connect', function (room) {
    console.log(Date.now(), socket.id, room, 'room_connect');
    if (!rooms.hasOwnProperty(room)) {
      console.log(Date.now(), socket.id, "room doesn't exist, creating it");
      rooms[room] = [];
    }
    rooms[room].push(socket);
    socket.room = room;

    // If this socket identified as broadcaster, mark it
    if (socket.isBroadcaster) {
      broadcasters[room] = socket.id;
      console.log(Date.now(), socket.id, "🔴 is the BROADCASTER");
    } else {
      console.log(Date.now(), socket.id, "👁️ is a VIEWER");
    }

    // Only send broadcaster's ID to viewers
    let ids = [];
    if (broadcasters[room]) {
      // If this is a viewer, send them the broadcaster's ID
      // If this is the broadcaster, send empty array (don't connect to self)
      if (socket.id !== broadcasters[room]) {
        ids.push(broadcasters[room]);
      }
    }
    console.log(Date.now(), socket.id, "sending IDs:", ids);
    socket.emit('listresults', ids);
  });


  socket.on('list', function () {
    //  Only return broadcaster's ID
    let ids = [];
    if (broadcasters[socket.room] && socket.id !== broadcasters[socket.room]) {
      ids.push(broadcasters[socket.room]);
    }
    console.log(Date.now(), socket.id, "list request - sending IDs:", ids);
    socket.emit('listresults', ids);
  });

  socket.on('signal', (to, from, data) => {
    // NEW: Only allow broadcaster ↔ viewer connections
    let fromSocket = rooms[socket.room]?.find(s => s.id === from);
    let toSocket = rooms[socket.room]?.find(s => s.id === to);

    if (!fromSocket || !toSocket) {
      console.log('Signal rejected: peer not found');
      return;
    }

    // Allow only if one of them is the broadcaster
    if (fromSocket.isBroadcaster || toSocket.isBroadcaster) {
      console.log('✓ Signal allowed:', from, '→', to);
      toSocket.emit('signal', to, from, data);
    } else {
      console.log('✗ BLOCKED viewer-to-viewer signal:', from, '→', to);
    }
  });


  // User sends their name when they join
  socket.on('set_username', function (name) {
    socket.userName = name;
    console.log(socket.id, 'set username to:', name);
  });

  // Handle cursor position updates
  socket.on('cursor_move', function (data) {
    // Broadcast cursor to everyone else in the room
    if (socket.room && rooms[socket.room]) {
      for (let i = 0; i < rooms[socket.room].length; i++) {
        if (rooms[socket.room][i].id !== socket.id) {
          rooms[socket.room][i].emit('cursor_move', {
            id: socket.id,
            x: data.x,
            y: data.y,
            name: socket.userName || 'Anonymous'
          });
        }
      }
    }
  });

  socket.on('daisy_created', function (daisyData) {
    console.log('Daisy created:', daisyData);
    // Broadcast to everyone in the room EXCEPT the sender
    if (socket.room && rooms[socket.room]) {
      for (let i = 0; i < rooms[socket.room].length; i++) {
        if (rooms[socket.room][i].id !== socket.id) {
          rooms[socket.room][i].emit('daisy_created', daisyData);
        }
      }
    }
  });


  socket.on('disconnect', function () {
    console.log(Date.now(), socket.id, "Client has disconnected");
    if (rooms[socket.room]) {
      // NEW: Check if THIS socket was the broadcaster
      let wasBroadcaster = (broadcasters[socket.room] === socket.id);

      if (wasBroadcaster) {
        console.log('🔴 BROADCASTER disconnected');
        broadcasters[socket.room] = null;

        // Only emit peer_disconnect if broadcaster left
        for (let i = 0; i < rooms[socket.room].length; i++) {
          if (rooms[socket.room][i].id != socket.id) {
            rooms[socket.room][i].emit('peer_disconnect', socket.id);
          }
        }
      } else {
        console.log('👁️ VIEWER disconnected (not notifying others)');
        // Don't emit peer_disconnect for regular viewers
      }

      //remove cursor when clients disconnects
      for (let i = 0; i < rooms[socket.room].length; i++) {
        if (rooms[socket.room][i].id != socket.id) {
          rooms[socket.room][i].emit('cursor_removed', socket.id);
        }
      }

      // Remove from rooms array
      let which = -1;
      for (let i = 0; i < rooms[socket.room].length; i++) {
        if (rooms[socket.room][i].id == socket.id) {
          which = i;
          break;
        }
      }
      if (which >= 0) {
        rooms[socket.room].splice(which, 1);
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


/* --------------------------------------------------------------------- */
/*                server side ON socket connection                       */
/* --------------------------------------------------------------------- */
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