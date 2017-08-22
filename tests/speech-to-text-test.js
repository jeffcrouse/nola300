require('dotenv').config()				// https://github.com/motdotla/dotenv
const fs = require('fs');
const util = require('util');


const WebSocket = require('ws');
const mic = require('mic');				// https://github.com/ashishbajaj99/mic
const request = require('request');		// https://github.com/request/request#http-authentication

// TODO: Ensure that "sox" is installed


var websocket = null;
var token = null;
var micInstance = null;
var ws_opened = false;
var options = {
    url: 'https://stream.watsonplatform.net/authorization/api/v1/token',
    qs: { url: "https://stream.watsonplatform.net/speech-to-text/api" },
    auth: { user: process.env.BLUEHOST_UNAME, pass: process.env.BLUEHOST_PASS }
}
request.get(options, function (error, response, body) {
	console.log('error:', error); // Print the error if one occurred
	console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
	//console.log('body:', body); // Print the HTML for the Google homepage.
	token = body;

	function onOpen(evt) {
		var message = {
			'action': 'start',
			'content-type': 'audio/l16;rate=22050',
			'word_confidence': true,
			'timestamps': true
		};
		websocket.send(JSON.stringify(message));
		ws_opened = true;
	}

	function onMessage(evt) {
		console.log("onMessage", evt.data);
	}

	var wsURI = 'wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?watson-token=' +
	  token + '&model=es-ES_BroadbandModel';
	websocket = new WebSocket(wsURI);
	websocket.onopen = function(evt) { onOpen(evt) };
	websocket.onclose = function(evt) { onClose(evt) };
	websocket.onmessage = function(evt) { onMessage(evt) };
	websocket.onerror = function(evt) { onError(evt) };


	micInstance = mic({ 'rate': '22050', 'channels': '1', 'debug': false });
	var micInputStream = micInstance.getAudioStream();

	micInputStream.on('data', function(data) {
		
	    console.log("Recieved Input Stream: " + data.length);

	    if(!ws_opened) {
	    	console.log('not opened - not sending data.')
	    	return;
	    }

	    websocket.send(data.buffer, function ack(error) {
	    	if(error) console.error(error);
		});
	});
	 
	micInputStream.on('error', function(err) {
	    cosole.log("Error in Input Stream: " + err);
	});

	micInstance.start();
});



process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {
	if(websocket && ws_opened) {
		var message = { 'action': 'stop' };
		websocket.send(JSON.stringify(message), function(){
			websocket.close();
		});
	}

	if(micInstance) {
		micInstance.stop();
	}

    if (options.cleanup) console.log('clean');
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));