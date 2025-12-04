/* -------------------------------------------------------------------------- */
/*                            server set up                                   */
/* -------------------------------------------------------------------------- */
import express from 'express';
import { WebSocketServer } from 'ws'; //import web socket (adam example)
import path from 'path'; //node js (adam example)
import { fileURLToPath } from 'url'; //node js (adam example)
import http from 'http';
import { Server as SocketIOServer } from 'socket.io'; //socket io from gemini

let app = express();
let server = http.createServer(app);
let port = process.env.PORT || 3000;

let wss = new WebSocketServer({ server }); //(adam example)


let __filename = fileURLToPath(import.meta.url); //defining file pathway for the 'import' syntax (adam example)
let __dirname = path.dirname(__filename); //defining file pathway for the 'import' syntax (adam example)


app.use('/', express.static('public'));


//create a port variable and listen
server.listen(port, () => {
  console.log('Server listening on port ', port);
});




/* -------------------------------------------------------------------------- */
/*                              webRTC socket                                 */
/* -------------------------------------------------------------------------- */

//STEP 2. Peers object to store peer ids (webRTC tutorial)
let peers = {};

//STEP 3. Create a web socket server to send signaling messages (webRTC tutorial)
let io = new SocketIOServer(server);

io.sockets.on('connection', (socket) => {
  console.log('We have a new client: ', socket.id);
  /*STEP 3.1. Add socket to 'peers' object*/
  peers[socket.id] = socket;
  console.log("we have a new client:" + socket.id + "!");

  /*STEP 6.3. Listen and get all peer ids*/
  socket.on('list', () => {
    //get an ids array
    let ids = Object.keys(peers);
    console.log(ids);

    //send all existing socket ids to this specific socket
    socket.emit('listresults', ids);
  });

  /*STEP 7.3. Relay signals back and forth*/
  socket.on('signal', (to, from, data) => {
    console.log('signal', to);

    //check if such peer exists in a 'peers' object
    if (to in peers) {
      //send signal to that peer
      peers[to].emit('signal', to, from, data);
    } else {
      console.log('Peer not found');
    };
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected: ', socket.id);

    io.emit('peer_disconnect', socket.id);

    /*STEP 3.2. Delete from 'peers' object*/
    delete peers[socket.id];
  });
});

/* -------------------------------------------------------------------------- */
/*                        LED brightness control from adam                    */
/* -------------------------------------------------------------------------- */

let clients = new Set(); //a js storage object, similiar to array, but will prevent duplicate data

let serverState = {
  // Example 1 state
  // ledOn: false,

  // Example 2 state
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