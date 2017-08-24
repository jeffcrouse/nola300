require('dotenv').config({ silent: true }); 
const stt = require('watson-developer-cloud/speech-to-text/v1');
const LineIn = require('line-in');  // https://github.com/linusu/node-line-in
const wav = require('wav');			// https://github.com/tootallnate/node-wav
const util = require('util');
var EventEmitter = require('events').EventEmitter;

const speechToText = new stt();


var SpeechToText = function() {
	EventEmitter.call(this);

	var self = this;

	var lineIn = null; // 2-channel 16-bit little-endian signed integer pcm encoded audio @ 44100 Hz
	var wavStream = null;
	var recognizeStream = null;
	var rsOptions = {
		content_type: 'audio/wav',
		timestamps: true,
		"interim_results": true,
		"readableObjectMode": true };
	var running = false;



	this.start = function(callback) {
		return new Promise((resolve, reject) => {
			if(running) return reject("[SpeechToText] already running");

			lineIn = new LineIn();
			wavStream = new wav.Writer({ sampleRate: 44100, channels: 2 });
			lineIn.pipe(wavStream);
			recognizeStream = speechToText.createRecognizeStream(rsOptions);
			wavStream.pipe(recognizeStream);

			recognizeStream.on('listening', on_listening);
			recognizeStream.on('data', on_data);
			recognizeStream.on('results', on_results);
			recognizeStream.on('close', on_close);

			running = true;
			resolve();
		})
	}

	this.stop = function(callback) {
		return new Promise((resolve, reject) => {
			if(!running) return reject("[SpeechToText] not running");

			console.log("[SpeechToText] closing");

			wavStream.destroy();	// first stop the wav writer going into the recognizeStream
			lineIn.destroy();		// Next stop the raw PCM data going into the wavwriter
			recognizeStream.destroy();

			lineIn = null;
			wavStream = null;
			recognizeStream = null;

			running = false;
			resolve();
		});
	}



	var on_listening = function(data) {
		console.log("[SpeechToText] listening")
	}
	
	var on_data = function(data) {
		console.log("[SpeechToText] data", arguments);
	}
	
	var on_results = function(data) {
		console.log("[SpeechToText] results ", util.inspect(data));
	}

	var on_close = function() {
		console.log("[SpeechToText] closing");
	}
}


util.inherits(SpeechToText, EventEmitter);
module.exports = SpeechToText;