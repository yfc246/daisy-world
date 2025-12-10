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
    console.log('Message from server:', event.data);

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

// NEW: Store other users' cursors
let otherCursors = {}; // { socketId: { x, y, name } }
let myName; //user entered name 
let myCursorColor; //user picked color 


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

    //get name and color from local storage
    myName = localStorage.getItem('userName') || 'Anonymous';
    myCursorColor = localStorage.getItem('cursorColor') || '#64FFC8';
    console.log('Loaded name:', myName, 'color:', myCursorColor);

    // Connect to broadcaster
    p5l = new p5LiveMedia(this, "CANVAS", myCanvas, "daisyworld", window.location.origin);
    console.log('VIEWER: p5LiveMedia created');

    // Send username to server
    setTimeout(() => {
        p5l.socket.emit('set_username', myName);
        console.log('Sent username:', myName);
    }, 100);


    /* --------------------------------------------------------------------- */
    /*                client side ON socket connection                       */
    /* --------------------------------------------------------------------- */
    // Listen for daisies
    p5l.socket.on('daisy_created', (daisyData) => {
        console.log('Received daisy:', daisyData);
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

        // fill(0, 255, 0);
        // textSize(20);
        // text('RECEIVING STREAM', 10, 30);
    } else if (p5l) {
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(16);
        text('Waiting for broadcaster...', width / 2, height / 2);
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

}

//     // NEW: Draw other users' cursors
//     for (let id in otherCursors) {
//         let cursor = otherCursors[id];

//         // Draw cursor dot
//         fill(255, 100, 200);
//         noStroke();
//         circle(cursor.x, cursor.y, 15);

//         // Draw name
//         fill(255);
//         textSize(16);
//         textAlign(LEFT, TOP);
//         text(cursor.name, cursor.x + 10, cursor.y + 10);
//     }

//     // Draw YOUR cursor
//     fill(100, 255, 200);
//     noStroke();
//     circle(mouseX, mouseY, 15);
//     fill(255);
//     text(myName, mouseX + 10, mouseY + 10);
// }

/* -------------------------------------------------------------------------- */
/*                         p5 play physics                                    */
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
    floor.color = color(0, 0, 200, 1);
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

    let daisyData = {
        x: mouseX,
        y: mouseY,
        color: selectedColor,
        timestamp: Date.now()
    };

    createDaisy(daisyData);

    if (p5l && p5l.socket) {
        p5l.socket.emit('daisy_created', daisyData);
        console.log('Emitted daisy:', daisyData);
    }
}

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
    if (p5l && p5l.socket && hasStarted) {
        p5l.socket.emit('cursor_move', {
            x: mouseX,
            y: mouseY
        });
    }

    // Prevent default
    return false;
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