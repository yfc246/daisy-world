console.log('sketch is working');

/* -------------------------------------------------------------------------- */
/*                           ws socket code(adam example)                     */
/* -------------------------------------------------------------------------- */

//1. client side socket variable set up (socket)
let brightnessSlider = document.getElementById('brightness-slider');
let brightnessValue = document.getElementById('brightness-value');
let statusDisplay = document.getElementById('status');


// Connect to WebSocket server for arduino
let protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
// const ws = new WebSocket(`${protocol}//${window.location.host}`);
let ws = new WebSocket(`${protocol}//${window.location.host}/arduino`);

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


/* -------------------------------------------------------------------------- */
/*                              p5.code                                       */
/* -------------------------------------------------------------------------- */
let bg;
let video; //for testing ml5
let floor, stone;//floor variables for p5 play
let selectedColor = 'white'; // Default selected color 
let daisy6Ary = []; //6 petal daisy array

let p5l; //p5 live media connection
let experienceStarted = false;
let videoReady = false; // for video timing

// Store other users' cursors
let otherCursors = {}; // { socketId: { x, y, name } }
let myName; //user entered name 
let myCursorColor; //user picked color 


// let handPose; //ml5
// let hands = [];// array for hands keypoints

function preload() {

  // preload() loads the image before setup() runs
  bg = loadImage('media/placeholder.jpg');

  // handPose = ml5.handPose();

}

function setup() {

  noCanvas(); //no canvas yet, wait for startBroaccaster()

}



// Called by landing.js when user clicks "Enter"
function startBroadcaster() {
  console.log('startBroadcaster() called');
  experienceStarted = true;

  //get name and color from local storage
  myName = localStorage.getItem('userName') || 'Anonymous';
  myCursorColor = localStorage.getItem('cursorColor') || '#64FFC8';
  console.log('Loaded name:', myName, 'color:', myCursorColor);

  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('main-content');
  console.log('Canvas created');

  console.log('BROADCASTER: Starting webcam...');

  world.gravity.y = 8;
  createFloor();
  createStone();
  noStroke();

  video = createCapture(VIDEO, (stream) => {
    console.log('BROADCASTER: Webcam ready');

    setTimeout(() => {
      videoReady = true;
      console.log('Video dimensions:', video.width, 'x', video.height);
    }, 500);

    p5l = new p5LiveMedia(this, "CAPTURE", stream, "daisyworld", window.location.origin);
    console.log('BROADCASTER: Broadcasting to "daisyworld"');

    // Send username to server
    setTimeout(() => {
      p5l.socket.emit('identify_broadcaster');
      p5l.socket.emit('set_username', myName);
      console.log('Sent username:', myName);
    }, 100);

    /* --------------------------------------------------------------------- */
    /*                client side ON socket connection                       */
    /* --------------------------------------------------------------------- */

    // Listen for daisies from other clients
    p5l.socket.on('daisy_created', (daisyData) => {
      console.log('Received daisy from another client:', daisyData);
      createDaisy(daisyData);
    });

    // Listen for other users' cursors
    p5l.socket.on('cursor_move', (data) => {
      otherCursors[data.id] = {
        x: data.x,
        y: data.y,
        name: data.name
      };
    });

    // Remove cursor when user disconnects
    p5l.socket.on('cursor_removed', (id) => {
      delete otherCursors[id];
    });

    // Tell server "I am the broadcaster"
    setTimeout(() => {
      p5l.socket.emit('identify_broadcaster');
    }, 100);

    p5l.on('ready', () => {
      console.log('BROADCASTER: ✓ Room ready');
    });

    p5l.on('connection', (id) => {
      console.log('BROADCASTER: ✓ New viewer connected! ID:', id);
    });

    p5l.on('disconnect', (id) => {
      console.log('BROADCASTER: Viewer disconnected:', id);
    });
  });



  video.muted = true;
  video.hide();

  // FIX: Force canvas to be visible after video.hide()
  setTimeout(() => {
    let canvasElement = document.querySelector('canvas');
    if (canvasElement) {
      canvasElement.style.visibility = 'visible';
      console.log('Canvas visibility fixed');
    }
  }, 100);

  loop();
}

function draw() {
  // console.log('DRAW IS RUNNING'); // Add this temporarily to see if draw runs

  if (!experienceStarted) {
    console.log('Waiting for experience to start');
    return;
  }

  // Background image (if there's no video footage)
  if (bg) {
    let bgScaleRatio = Math.max(width / bg.width, height / bg.height);
    let bgW = bg.width * bgScaleRatio;
    let bgH = bg.height * bgScaleRatio;
    image(bg, (width - bgW) / 2, (height - bgH) / 2, bgW, bgH);
  }

  // Draw webcam video
  if (videoReady && video && video.width > 0) {
    // console.log('Drawing video'); // Temporary debug
    let videoScaleRatio = Math.max(width / video.width, height / video.height);
    let w = video.width * videoScaleRatio;
    let h = video.height * videoScaleRatio;
    image(video, (width - w) / 2, (height - h) / 2, w, h);
  }

  // Draw other users' cursors 
  for (let id in otherCursors) {
    let cursor = otherCursors[id];
 
    fill(150, 150, 150, 150); 
    noStroke();
    circle(cursor.x, cursor.y, 15);

    // Draw name
    fill(255);
    textFont('Tiny5');
    textSize(16);
    textAlign(LEFT, TOP);
    text(cursor.name, cursor.x + 10, cursor.y + 10);
  }

  // Draw YOUR cursor
  if (myCursorColor && typeof myCursorColor === 'string') {
    let myColor = color(myCursorColor);
    myColor.setAlpha(150);
    fill(myColor);
  } else {
    // Fallback to default green
    fill(100, 255, 200, 150);
  }

  noStroke();
  circle(mouseX, mouseY, 15);
  fill(255);
  textFont('Tiny5');
  text(myName, mouseX + 10, mouseY + 10);


  // // Draw other users' cursors
  // for (let id in otherCursors) {
  //   let cursor = otherCursors[id];

  //   // Draw cursor dot
  //   fill(255, 100, 200);
  //   noStroke();
  //   circle(cursor.x, cursor.y, 15);

  //   // Draw name
  //   fill(255);
  //   textSize(16);
  //   textAlign(LEFT, TOP);
  //   text(cursor.name, cursor.x + 10, cursor.y + 10);
  // }

  // // Draw YOUR cursor
  // fill(100, 255, 200);
  // noStroke();
  // circle(mouseX, mouseY, 15);
  // fill(255);
  // text(myName, mouseX + 10, mouseY + 10);

  // // Debug info
  // fill(255, 0, 0);
  // textSize(20);
  // text('BROADCASTING', 10, 30);
  // text(`Video ready: ${videoReady}`, 10, 60);
  // if (video) {
  //   text(`Video size: ${video.width} x ${video.height}`, 10, 90);
  // }
}





/* -------------------------------------------------------------------------- */
/*                         p5 play physics set up                             */
/* -------------------------------------------------------------------------- */

function createFloor() {

  // Remove old floor if it exists for reponsive design (claude)
  if (floor) {
    floor.remove();
  }

  // p5 play chain colliders vertex mode

  let offsetY = 100 / height

  floor = new Sprite([
    [width * 0.2, height * (0.51 + offsetY)],
    [width * 0.267, height * (0.68 + offsetY)],
    [width * 0.333, height * (0.73 + offsetY)],
    [width * 0.4, height * (0.78 + offsetY)],
    [width * 0.467, height * (0.82 + offsetY)],
    [width * 0.533, height * (0.82 + offsetY)],
    [width * 0.6, height * (0.78 + offsetY)],
    [width * 0.667, height * (0.73 + offsetY)],
    [width * 0.733, height * (0.68 + offsetY)],
    [width * 0.8, height * (0.51 + offsetY)]
  ]);

  floor.collider = 'static';
  floor.color = color(0, 0, 200, 255);
}

function createStone() {

  // Remove old stone if it exists
  if (stone) {
    stone.remove();
  }

  let offsetY = 120 / height; // offset y position for easier adjustment later

  stone = new Sprite([
    [width * 0.4, height * (0.58 + offsetY)],
    // [width * 0.442, height * (0.52 + offsetY)],    
    [width * 0.46, height * (0.49 + offsetY)],
    // [width * 0.5, height * (0.5 + offsetY)],       
    [width * 0.53, height * (0.485 + offsetY)],
    [width * 0.55, height * (0.5 + offsetY)],
    // [width * 0.6, height * (0.55 + offsetY)]     
  ]);

  stone.collider = 'static';
  stone.color = color(0, 0, 0, 255);
}

/* -------------------------------------------------------------------------- */
/*                         p5 interactions                                    */
/* -------------------------------------------------------------------------- */

//for selecting daisy color with html button 
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

  // Prevent daisy creation on right click
  if (mouseButton === RIGHT) {
    return;
  }

  // Prevent daisy creation when clicking on buttons or UI elements
  let clickedElement = document.elementFromPoint(mouseX, mouseY);

  if (clickedElement && (
    clickedElement.tagName === 'BUTTON' ||
    clickedElement.tagName === 'INPUT' ||
    clickedElement.tagName === 'LABEL' ||
    clickedElement.closest('.color-btn') ||
    clickedElement.closest('#aboutBtn') ||
    clickedElement.closest('#color-selector') ||
    clickedElement.closest('.popup-overlay')
  )) {
    console.log('Clicked on UI element, no daisy created');
    return;
  }

  // Create daisy data object
  let daisyData = {
    x: mouseX,
    y: mouseY,
    color: selectedColor,
    timestamp: Date.now()
  };

  // Create daisy locally
  createDaisy(daisyData);

  // Emit to all other clients via Socket.IO
  if (p5l && p5l.socket) {
    p5l.socket.emit('daisy_created', daisyData);
    console.log('Emitted daisy:', daisyData);
  }
}

// Separate function to create daisy (so we can reuse it)
function createDaisy(daisyData) {
  let daisy6 = new Sprite(daisyData.x, daisyData.y);
  daisy6.diameter = 20;
  daisy6.bounciness = 0.7;

  if (daisyData.color === 'white') {
    daisy6.image = 'media/w-daisy-6.png';
    daisy6.image.scale = 0.8;
  } else {
    daisy6.image = 'media/b-daisy-6.png';
    daisy6.image.scale = 0.8;
  }

  // daisy6.vel.x = random(-2, 2);
  // daisy6.vel.y = random(-3, 1);

  daisy6Ary.push(daisy6);
}

function mouseMoved() {
  // Send cursor position to server
  if (p5l && p5l.socket && experienceStarted) {
    p5l.socket.emit('cursor_move', {
      x: mouseX,
      y: mouseY
    });
  }

  // Prevent default
  return false;
}

/* -------------------------------------------------------------------------- */
/*                      about pop up page                                     */
/* -------------------------------------------------------------------------- */

function openAbout() {
  document.getElementById('aboutPopup').classList.add('active');
}

function closeAbout() {
  document.getElementById('aboutPopup').classList.remove('active');
}

document.getElementById('aboutPopup').addEventListener('click', function (e) {
  if (e.target === this) {
    closeAbout();
  }
});




function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createFloor(); // Recreate floor with new proportions
}

