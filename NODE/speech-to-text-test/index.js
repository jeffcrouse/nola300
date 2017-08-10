require('dotenv').config()				// https://github.com/motdotla/dotenv
const fs = require('fs');

const WebSocket = require('ws');
const mic = require('mic');				// https://github.com/ashishbajaj99/mic
const request = require('request');		// https://github.com/request/request#http-authentication

// TODO: Ensure that "sox" is installed



var token = null;
var options = {
    url: 'https://stream.watsonplatform.net/authorization/api/v1/token',
    qs: { url: "https://stream.watsonplatform.net/speech-to-text/api" },
    auth: { user: process.env.BLUEHOST_UNAME, pass: process.env.BLUEHOST_PASS }
}
request.get(options, function (error, response, body) {
	console.log('error:', error); // Print the error if one occurred
	console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
	console.log('body:', body); // Print the HTML for the Google homepage.

	token = body;

	var ws_url = " wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?watson-token="+token;
	const ws = new WebSocket(ws_url);

	ws.on('open', function open() {
		ws.send('something');
	});

	ws.on('message', function incoming(data) {
		console.log(data);
	});
});




// var micInstance = mic({ 'rate': '16000', 'channels': '1', 'debug': true });
// var micInputStream = micInstance.getAudioStream();

// micInputStream.on('data', function(data) {
//     //console.log("Recieved Input Stream: " + data.length);
// });
 
// micInputStream.on('error', function(err) {
//     cosole.log("Error in Input Stream: " + err);
// });


// micInstance.start();


