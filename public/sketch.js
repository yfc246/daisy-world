console.log('sketch is working');
/* -------------------------------------------------------------------------- */
/*                              p5.code                                       */
/* -------------------------------------------------------------------------- */
let bg;
let camera;
let x = 0;
let ball, floor;//testing p5 play

function preload() {

  // preload() loads the image before setup() runs
  bg = loadImage('media/blue-glitter-2.gif');
  // bg = loadImage('media/blue-glitter_1.jpg');

  console.log(bg);

}

function setup() {

  createCanvas(windowWidth, windowHeight);

  // Get the raw DOM video element from HTML - but wait for it to be ready (Claude)
  setTimeout(() => {
    camera = document.getElementById('myVideo');
    console.log('Camera element:', camera);
  }, 100);

  //world set up for p5 play
  world.gravity.y = 10;
  player = new Sprite(50, 0);
  floor = new Sprite(250, 400, 500, 40, STATIC);
  // player.color = 'yellow';
  player.color = color(0, 0, 255, 50);
  noStroke();
  floor.color = color(0, 255, 0, 50);

}

function draw() {
  // background(220);
  background(bg);


  // Draw the video
  try {
    if (camera && camera.readyState >= 2) { //checking if video has loaded 
      drawingContext.drawImage(camera, (width - 800) / 2, (height - 600) / 2, 800, 600); //using this instead of image() because it was giving error other wise (claude)
    }
  } catch (e) {
    console.error('Error drawing video:', e);
  }

  // fill(255);
  // circle(x, height / 2, 50)
  // if (x > width) {
  //   x = 0

  // } else {
  //   x += 10
  // }

  if (mouse.presses()) {
    player.vel.y = -4;
    player.vel.x = 3;
  }
}


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

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

