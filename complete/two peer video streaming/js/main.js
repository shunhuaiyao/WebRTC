/****************************************************************************
 * Initial setup
 ****************************************************************************/

var configuration = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};
// {"url":"stun:stun.services.mozilla.com"}
var server = 'https://140.114.77.126:8080/';
var serverIP = '140.114.77.126';

var roomURL = document.getElementById('url'),
    video = document.getElementById("localVideo"),
    remoteVideo = document.getElementById("remoteVideo"),
    photo = document.getElementById('photo'),
    photoContext = photo.getContext('2d'),
    trail = document.getElementById('trail'),

    snapBtn = document.getElementById('snap'),
    sendBtn = document.getElementById('send'),
    snapAndSendBtn = document.getElementById('snapAndSend'),
    startButton = document.getElementById("startButton"),
    callButton = document.getElementById("callButton"),
    hangupButton = document.getElementById("hangupButton"),
 
    localStream = null;
    // Default values for width and height of the photoContext.
    // Maybe redefined later based on user's webcam video stream.
    photoContextW = 300, photoContextH = 150;

// Attach even handlers
video.addEventListener('play', setCanvasDimensions);
snapBtn.addEventListener('click', snapPhoto);
sendBtn.addEventListener('click', sendPhoto);
snapAndSendBtn.addEventListener('click', snapAndSend);
startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

startButton.disabled = false;
callButton.disabled = true;
hangupButton.disabled = true;
snapBtn.disabled = true;
sendBtn.disabled = true;
snapAndSendBtn.disabled = true;

// Create a random room if not already present in the URL.
var isInitiator;
var room = window.location.hash.substring(1);
if (!room) {
    room = window.location.hash = randomToken();
}


/**************************************************************************** 
 * User media (webcam) 
 ****************************************************************************/
function start() {
  trace("Requesting local stream");
  startButton.disabled = true;
  snapBtn.disabled = false;

  getUserMedia({audio:true, video:true}, getMediaSuccessCallback, getMediaErrorCallback);
}

function getMediaSuccessCallback(stream) {
    callButton.disabled = false;
    var streamURL = window.URL.createObjectURL(stream);
    console.log('getUserMedia video stream URL:', streamURL);
    localStream = stream; // stream available to console

    video.src = streamURL;
    show(snapBtn);
}

function getMediaErrorCallback(error){
    console.log("getUserMedia error:", error);
}

function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  sendBtn.disabled = false;
  snapAndSendBtn.disabled = false;
  trace("Starting call");

    // Join a room
    socket.emit('create or join', room);

  // if (localStream.getVideoTracks().length > 0) {
    // trace('Using video device: ' + localStream.getVideoTracks()[0].label);
  // }
  // if (localStream.getAudioTracks().length > 0) {
    // trace('Using audio device: ' + localStream.getAudioTracks()[0].label);
  // }
}

function hangup() {
  trace("Ending call");
  peerConn.close();
  peerConn = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
  
  //send message to server
  sendMessage({
                type: 'bye',
                id: clientID,
				room: room
            });
}

/**************************************************************************** 
 * Aux functions, mostly UI-related
 ****************************************************************************/

function snapPhoto() {
    photoContext.drawImage(video, 0, 0, photoContextW, photoContextH);
    show(photo, sendBtn);
}

function sendPhoto() {
    // Split data channel message in chunks of this byte length.
    var CHUNK_LEN = 64000;

    var img = photoContext.getImageData(0, 0, photoContextW, photoContextH),
        len = img.data.byteLength,
        n = len / CHUNK_LEN | 0;

    console.log('Sending a total of ' + len + ' byte(s)');
    dataChannel.send(len);

    // split the photo and send in chunks of about 64KB
    for (var i = 0; i < n; i++) {
        var start = i * CHUNK_LEN,
            end = (i+1) * CHUNK_LEN;
        console.log(start + ' - ' + (end-1));
        dataChannel.send(img.data.subarray(start, end));
    }

    // send the reminder, if any
    if (len % CHUNK_LEN) {
        console.log('last ' + len % CHUNK_LEN + ' byte(s)');
        dataChannel.send(img.data.subarray(n * CHUNK_LEN));
    }
}

function snapAndSend() {
    snapPhoto();
    sendPhoto();
}

function renderPhoto(data) {
    var canvas = document.createElement('canvas');
    canvas.classList.add('photo');
    trail.insertBefore(canvas, trail.firstChild);

    var context = canvas.getContext('2d');
    var img = context.createImageData(photoContextW, photoContextH);
    img.data.set(data);
    context.putImageData(img, 0, 0);
}

function setCanvasDimensions() {
    if (video.videoWidth == 0) {
        setTimeout(setCanvasDimensions, 200);
        return;
    }
    
    console.log('video width:', video.videoWidth, 'height:', video.videoHeight)

    photoContextW = video.videoWidth / 2;
    photoContextH = video.videoHeight / 2;
    //photo.style.width = photoContextW + 'px';
    //photo.style.height = photoContextH + 'px';
    // TODO: figure out right dimensions
    photoContextW = 300; //300;
    photoContextH = 150; //150;
}

function show() {
    Array.prototype.forEach.call(arguments, function(elem){
        elem.style.display = null;
    });
}

function hide() {
    Array.prototype.forEach.call(arguments, function(elem){
        elem.style.display = 'none';
    });
}

function randomToken() {
    return Math.floor((1 + Math.random()) * 1e16).toString(16).substring(1);
}

function trace(text) {
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}
