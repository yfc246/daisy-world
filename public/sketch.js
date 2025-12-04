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
let video; //for testing ml5
let floor, stone;//floor variables for p5 play
let selectedColor = 'white'; // Default selected color 
let daisy6Ary = []; //6 petal daisy array

let handPose; //ml5
let hands = [];// array for hands keypoints

function preload() {

  // preload() loads the image before setup() runs
  bg = loadImage('media/placeholder.jpg');
  // bg = loadImage('media/blue-glitter_1.jpg');

  // cursor = loadImage('media/cursor.png');
  handPose = ml5.handPose();



  console.log(bg);

}

function setup() {

  createCanvas(windowWidth, windowHeight);
  // // Hide the default cursor
  // noCursor();

  // video = createCapture(VIDEO);
  // video.size(windowWidth, windowHeight);
  // video.hide();
  // handPose.detectStart(video, gotHands);

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

  let bgScale = Math.max(width / bg.width, height / bg.height);
    let bgW = bg.width * bgScale;
    let bgH = bg.height * bgScale;
    image(bg, (width - bgW) / 2, (height - bgH) / 2, bgW, bgH);
  // image(bg, 0, 0, width, height);
  // angleMode(DEGREES);


   try {
        if (camera && camera.readyState >= 2 && camera.videoWidth > 0) {
            let scale = Math.max(width / camera.videoWidth, height / camera.videoHeight);
            let w = camera.videoWidth * scale;
            let h = camera.videoHeight * scale;
            drawingContext.drawImage(camera, (width - w) / 2, (height - h) / 2, w, h);
        }
    } catch (e) {
        console.error('Error drawing video:', e);
    }

  // // Draw the video
  // try {
  //   if (camera && camera.readyState >= 2) { //checking if video has loaded 
  //     drawingContext.drawImage(camera, (width - 800) / 2, (height - 600) / 2, 800, 600); //using this instead of image() because it was giving error other wise (claude)
  //   }
  // } catch (e) {
  //   console.error('Error drawing video:', e);
  // }

  // Draw the video(full screen )
//  try {
//     if (camera && camera.readyState >= 2 && camera.videoWidth > 0) {
//         let videoW = camera.videoWidth;
//         let videoH = camera.videoHeight;
        
//         let scale = Math.max(width / videoW, height / videoH);
//         let scaledW = videoW * scale;
//         let scaledH = videoH * scale;
        
//         drawingContext.drawImage(
//             camera, 
//             (width - scaledW) / 2, 
//             (height - scaledH) / 2, 
//             scaledW, 
//             scaledH
//         );
//     }
// } catch (e) {
//     console.error('Error drawing video:', e);
// }

  // image(cursor, mouseX, mouseY);

  //ml5
  // push();
  // // Draw the video
  // imageMode(CENTER);
  // let scale = width / bg.width;
  // image(video, width/2, height/2, bg.width * scale, bg.height * scale);
  // pop();
    // try {
  //   if (camera && camera.readyState >= 2) { //checking if video has loaded 
  //     drawingContext.drawImage(camera, (width - 800) / 2, (height - 600) / 2, 800, 600); //using this instead of image() because it was giving error other wise (claude)
  //   }
  // } catch (e) {
  //   console.error('Error drawing video:', e);
  // }

  // for (let i = 0; i < hands.length; i++) {
  //   let hand = hands[i];
  //   for (let j = 0; j < hand.keypoints.length; j++) {
  //     let keypoint = hand.keypoints[j];
  //     fill(0, 255, 0);
  //     noStroke();
  //     circle(keypoint.x, keypoint.y, 10);
  //   }
  // }
}

// //for ml5
// function gotHands(results) {
//   console.log(results);
//   hands = results;
// }
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

  //sprite set up for 6 petal daisy
  let daisy6 = new Sprite(mouseX, mouseY);
  daisy6.diameter = 20;
  daisy6.bounciness = 0.7;


  // Set color based on selection
  if (selectedColor === 'white') {
    daisy6.image = 'media/w-daisy-6.png';
    daisy6.image.scale = 0.8;
  } else {
    daisy6.image = 'media/b-daisy-6.png';

  }

  // Add some initial velocity
  daisy6.vel.x = random(-2, 2);
  daisy6.vel.y = random(-3, 1);

  // balls.push(ball);
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

