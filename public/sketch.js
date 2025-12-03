console.log('sketch is working');

/* -------------------------------------------------------------------------- */
/*                              socket code                                   */
/* -------------------------------------------------------------------------- */

//1. client side socket variable set up (socket)
let brightnessSlider = document.getElementById('brightness-slider');
let brightnessValue = document.getElementById('brightness-value');
let statusDisplay = document.getElementById('status');


// Connect to WebSocket server
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${protocol}//${window.location.host}`);

ws.onopen = () => {
  console.log('Connected to server');
  statusDisplay.textContent = 'Connected'; //console error : uncaught type error cannot set 
  statusDisplay.style.color = 'green';
};

ws.onclose = () => {
  console.log('Disconnected from server');
  statusDisplay.textContent = 'Disconnected';
  statusDisplay.style.color = 'red';
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  statusDisplay.textContent = 'Error';
  statusDisplay.style.color = 'red';
};

//1.2 set up event listeners
ws.onmessage = (event) => {
  console.log('Message from server:', event.data);
  try {
    const data = JSON.parse(event.data);
    
    // Handle initial state from server
    if (data.type === 'initialState') {
      brightnessSlider.value = data.state.brightness;
      brightnessValue.textContent = data.state.brightness;
    
    }
    
    // Update brightness slider from other clients
    if (data.type === 'brightness' && data.value !== undefined) {
      brightnessSlider.value = data.value;
      brightnessValue.textContent = data.value;
    }
    
  } catch (error) {
    console.error('Error parsing message:', error);
  }
};

//1.2 set up event listeners
brightnessSlider.addEventListener('input', (e) => {
  const value = e.target.value;
  brightnessValue.textContent = value;
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'brightness',
      value: parseInt(value)
    }));
  }
});

// let cursor1 = document.getElementById('cursor');

// document.addEventListener('mousemove', (e) => {
//     cursor.style.left = e.clientX + 'px';
//     cursor.style.top = e.clientY + 'px';
// });

/* -------------------------------------------------------------------------- */
/*                              p5.code                                       */
/* -------------------------------------------------------------------------- */
let bg;
let cursor;
let camera;
// let x = 0;
let floor, stone;//floor variables for p5 play
let selectedColor = 'white'; // Default ball color 
let balls = []; // Array to store all created balls

function preload() {

  // preload() loads the image before setup() runs
  bg = loadImage('media/blue-glitter-2.gif');
  // bg = loadImage('media/blue-glitter_1.jpg');

  cursor = loadImage('media/cursor.png');


  console.log(bg);

}

function setup() {

  createCanvas(windowWidth, windowHeight);
  // Hide the default cursor
  noCursor();
  
  

  // Get the raw DOM video element from HTML - but wait for it to be ready (Claude)
  setTimeout(() => {
    camera = document.getElementById('myVideo');
    console.log('Camera element:', camera);
  }, 100);

  // //world set up for p5 play
  world.gravity.y = 8;
  createFloor();
  createStone();
  noStroke();


}

function draw() {
  
  background(bg);

  // Draw the video
  try {
    if (camera && camera.readyState >= 2) { //checking if video has loaded 
      drawingContext.drawImage(camera, (width - 800) / 2, (height - 600) / 2, 800, 600); //using this instead of image() because it was giving error other wise (claude)
    }
  } catch (e) {
    console.error('Error drawing video:', e);
  }

  image (cursor, mouseX, mouseY);


  // // Check collisions
  //   if (player.collides(floor)) {
  //       player.vel.y = -5;
  //   }
    
  //   if (player.collides(ceiling)) {
  //       player.vel.y = 2;
  //   }
  // fill(255);
  // circle(x, height / 2, 50)
  // if (x > width) {
  //   x = 0

  // } else {
  //   x += 10
  // }

  // if (mouse.presses()) {
  //   player.vel.y = -4;
  //   player.vel.x = 3;
  // }

  // if (mouse.presses()) {
  //   // Create a new sprite at the mouse's current position
  //   let newSprite = new Sprite(mouse.x, mouse.y, 20);
  //   newSprite.color = color(255, 255, 255, 50); // Set the color of the new sprite
  //   noStroke();
  // }
  // floor = new Sprite([[20, 60], [40, 90], [70, 110], [100, 120], [130, 120], [160, 110], [180, 90], [200, 60]]);
  // floor.physics = STATIC;

  // if (ball.collides(floor)) {
  //   ball.vel.y = -2;
  // }
}


function createFloor() {

  // Remove old floor if it exists
  if (floor) {
    floor.remove();
  }

  // chain colliders vertex mode
  floor = new Sprite([
    [width * 0.2, height * 0.51],    
    [width * 0.267, height * 0.68],  
    [width * 0.333, height * 0.73],   
    [width * 0.4, height * 0.78],    
    [width * 0.467, height * 0.82],  
    [width * 0.533, height * 0.82],  
    [width * 0.6, height * 0.78],    
    [width * 0.667, height * 0.73],   
    [width * 0.733, height * 0.68],  
    [width * 0.8, height * 0.51]     
  ]);

  floor.collider = 'static'; 
  floor.color = color(0, 0, 200, 1);
}

function createStone() {

  // Remove old stone if it exists
  if (stone) {
    stone.remove();
  }

  let offsetPx = 40 / height; // offset y position for easier adjustment later

  stone = new Sprite([
    [width * 0.4, height * (0.6 + offsetPx)],     
    // [width * 0.442, height * (0.52 + offsetPx)],    
    [width * 0.47, height * (0.51 + offsetPx)],   
    // [width * 0.5, height * (0.5 + offsetPx)],       
    [width * 0.517, height * (0.505 + offsetPx)],   
    [width * 0.55, height * (0.55 + offsetPx)],    
    // [width * 0.6, height * (0.55 + offsetPx)]     
  ]);

  stone.collider = 'static';
  stone.color = color(0, 0, 0, 1); 
}

function selectColor(color) {
    selectedColor = color;
    
    // connect to html
    document.getElementById('whiteBtn').classList.remove('selected');
    document.getElementById('blackBtn').classList.remove('selected');
    
    if (color === 'white') {
        document.getElementById('whiteBtn').classList.add('selected');
    } else {
        document.getElementById('blackBtn').classList.add('selected');
    }
}

function mousePressed() {
    // Create new ball at mouse position
    let ball = new Sprite(mouseX, mouseY);
    ball.diameter = 20;
    ball.bounciness = 0.7;
    
    // Set color based on selection
    if (selectedColor === 'white') {
        ball.color = color(255, 255, 255, 75);
    } else {
        ball.color = color(0, 0, 0, 75);
    }
    
    // Add some initial velocity
    // ball.vel.x = random(-2, 2);
    // ball.vel.y = random(-3, 1);
    
    balls.push(ball);
}

function openAbout() {
    document.getElementById('aboutPopup').classList.add('active');
}

function closeAbout() {
    document.getElementById('aboutPopup').classList.remove('active');
}

document.getElementById('aboutPopup').addEventListener('click', function(e) {
    if (e.target === this) {
        closeAbout();
    }
});




function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createFloor(); // Recreate floor with new proportions
  player.x = width * 0.1;
}

// let customCursor = document.getElementById('cursor');

// document.addEventListener('mousemove', (e) => {
//     customCursor.style.left = e.clientX + 'px';
//     customCursor.style.top = e.clientY + 'px';
// });

// /* -------------------------------------------------------------------------- */
// /*                              webRTCcode                                    */
// /* -------------------------------------------------------------------------- */

/*STEP 5.5. Capture video stream on window load*/
window.addEventListener('load', () => {
  initCapture(); //capturing the local (my) camera 
});

/*Global variables*/
let myLocalMediaStream;
let socket;
let myFriends = {};

/*STEP 5. Capture video stream*/
function initCapture() {
  console.log('init capture');

  /* STEP. 5.1. This element will display my webcam*/
  let videoEl = document.getElementById('myVideo');

  /*STEP 5.2. Video constraints for webcam to fulfill*/
  let constraints = { audio: false, video: true };

  /*STEP 5.3. Ask for user permission for camera */
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(stream => { //when the stream is available
      //use the stream
      console.log(stream);
      //set to global variable
      myLocalMediaStream = stream;
      /*STEP 5.4. Attach to video object*/
      videoEl.srcObject = stream;

      //wait for the stream to load enough to play the video
      videoEl.onloadedmetadata = evt => {
        // console.log(evt);
        videoEl.play();
      };
    });

  //   /*STEP 6.5. Start socket connection*/
  //   setupSocket();
}


// //on error
// peerConnection.on('error', err => {
//   console.log(err);
// });

