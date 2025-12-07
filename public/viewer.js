/* -------------------------------------------------------------------------- */
/*                              socket code (Arduino)                         */
/* -------------------------------------------------------------------------- */

let brightnessSlider = document.getElementById('brightness-slider');
let brightnessValue = document.getElementById('brightness-value');
let statusDisplay = document.getElementById('status');

// Connect to Arduino WebSocket
let protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
let ws = new WebSocket(`${protocol}//${window.location.host}/arduino`);

ws.onopen = () => {
  console.log('Connected to Arduino WebSocket');
  if (statusDisplay) {
    statusDisplay.textContent = 'Connected';
    statusDisplay.style.color = 'green';
  }
};

ws.onclose = () => {
  console.log('Disconnected from Arduino WebSocket');
  if (statusDisplay) {
    statusDisplay.textContent = 'Disconnected';
    statusDisplay.style.color = 'red';
  }
};

ws.onerror = (error) => {
  console.error('Arduino WebSocket error:', error);
};

ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);

    if (data.type === 'initialState') {
      brightnessSlider.value = data.state.brightness;
      brightnessValue.textContent = data.state.brightness;
    }

    if (data.type === 'brightness' && data.value !== undefined) {
      brightnessSlider.value = data.value;
      brightnessValue.textContent = data.value;
    }
  } catch (error) {
    console.error('Error parsing message:', error);
  }
};

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
/*                              p5 code                                       */
/* -------------------------------------------------------------------------- */

let bg;
let remoteStream;
let floor, stone;
let selectedColor = 'white';
let daisy6Ary = [];

let p5l;
let myCanvas;
let hasStarted = false;

function preload() {
  bg = loadImage('media/placeholder.jpg');
}

function setup() {
  // Create canvas immediately in setup (like your example)
  myCanvas = createCanvas(windowWidth, windowHeight);
  myCanvas.parent('main-content');
  console.log('VIEWER: Setup started');
  
  // Initialize p5.play world
  world.gravity.y = 8;
  createFloor();
  createStone();
  noStroke();
  
  // Fix canvas visibility
  setTimeout(() => {
    let canvasElement = document.querySelector('canvas');
    if (canvasElement) {
      canvasElement.style.visibility = 'visible';
    }
  }, 100);
}

// Called by landing.js when user clicks "Enter"
function startViewer() {
  if (hasStarted) {
    console.log('VIEWER: Already started');
    return;
  }
  
  hasStarted = true;
  console.log('VIEWER: Starting...');
  console.log('VIEWER: Connecting to room...');
  console.log('VIEWER: Server URL:', window.location.origin);
  
  // Connect to broadcaster
  p5l = new p5LiveMedia(this, "CANVAS", myCanvas, "daisyworld", window.location.origin);
  console.log('VIEWER: p5LiveMedia created');
  
  p5l.on('ready', () => {
    console.log('VIEWER: ✓ Room ready');
  });
  
  p5l.on('stream', (stream, id) => {
    console.log('VIEWER: ✓✓✓ Got stream from broadcaster!', id);
    remoteStream = stream;
    remoteStream.hide();
    
    if (remoteStream.elt) {
      remoteStream.elt.play().catch(e => console.log('Play error:', e));
    }
  });
  
  p5l.on('connection', (id) => {
    console.log('VIEWER: ✓ Connected with peer ID:', id);
  });
  
  p5l.on('disconnect', (id) => {
    console.log('VIEWER: Broadcaster disconnected:', id);
    remoteStream = null;
  });
}

function draw() {
  // Background image
  let bgScaleRatio = Math.max(width / bg.width, height / bg.height);
  let bgW = bg.width * bgScaleRatio;
  let bgH = bg.height * bgScaleRatio;
  image(bg, (width - bgW) / 2, (height - bgH) / 2, bgW, bgH);

  // Draw received stream or waiting message
  if (remoteStream && remoteStream.width > 0) {
    let videoScaleRatio = Math.max(width / remoteStream.width, height / remoteStream.height);
    let w = remoteStream.width * videoScaleRatio;
    let h = remoteStream.height * videoScaleRatio;
    image(remoteStream, (width - w) / 2, (height - h) / 2, w, h);
    
    fill(0, 255, 0);
    textSize(20);
    text('RECEIVING STREAM', 10, 30);
  } else if (p5l) {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(30);
    text('Waiting for broadcaster...', width/2, height/2);
  }
}

/* -------------------------------------------------------------------------- */
/*                         p5 play physics                                    */
/* -------------------------------------------------------------------------- */

function createFloor() {
  if (floor) floor.remove();

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
  if (stone) stone.remove();

  let offsetPx = 40 / height;

  stone = new Sprite([
    [width * 0.4, height * (0.6 + offsetPx)],
    [width * 0.47, height * (0.51 + offsetPx)],
    [width * 0.517, height * (0.505 + offsetPx)],
    [width * 0.55, height * (0.55 + offsetPx)],
  ]);

  stone.collider = 'static';
  stone.color = color(0, 0, 0, 1);
}

/* -------------------------------------------------------------------------- */
/*                         p5 interactions                                    */
/* -------------------------------------------------------------------------- */

function selectColor(color) {
  selectedColor = color;
  document.getElementById('whiteBtn').classList.remove('selected');
  document.getElementById('blackBtn').classList.remove('selected');

  if (color === 'white') {
    document.getElementById('whiteBtn').classList.add('selected');
  } else {
    document.getElementById('blackBtn').classList.add('selected');
  }
}

function mousePressed() {
  let daisy6 = new Sprite(mouseX, mouseY);
  daisy6.diameter = 20;
  daisy6.bounciness = 0.7;

  if (selectedColor === 'white') {
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
/*                      about popup                                           */
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
  createFloor();
  createStone();
}