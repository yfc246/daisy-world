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

    /* --------------------------------------------------------------------- */
    /*                client side ON socket connection                       */
    /* --------------------------------------------------------------------- */

    // Listen for daisies from other clients
    p5l.socket.on('daisy_created', (daisyData) => {
      console.log('Received daisy from another client:', daisyData);
      createDaisy(daisyData);
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

  background(0); // Start with simple black background

  // Background image
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
  }

  daisy6.vel.x = random(-2, 2);
  daisy6.vel.y = random(-3, 1);

  daisy6Ary.push(daisy6);
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

