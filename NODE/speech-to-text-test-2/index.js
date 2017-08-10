'use strict';
require('dotenv').config({ silent: true }); // optional, handy for local development
const SpeechToText = require('watson-developer-cloud/speech-to-text/v1');
const LineIn = require('line-in'); // the `mic` package also works - it's more flexible but requires a bit more setup
const wav = require('wav');
const util = require('util');

const speechToText = new SpeechToText(
  {
  	username: process.env.SPEECH_TO_TEXT_USERNAME,
	password: process.env.SPEECH_TO_TEXT_PASSWORD,
  }
);

const lineIn = new LineIn(); // 2-channel 16-bit little-endian signed integer pcm encoded audio @ 44100 Hz

const wavStream = new wav.Writer({ sampleRate: 44100, channels: 2 });

const recognizeStream = speechToText.createRecognizeStream({ 
	content_type: 'audio/wav',
	timestamps: true,
	"interim_results": true,
	"readableObjectMode": true
});

lineIn.pipe(wavStream);

wavStream.pipe(recognizeStream);

recognizeStream.on('listening', function(data){
	console.log("listening")
});

recognizeStream.on('data', function(data){

	console.log("data", arguments);
});


recognizeStream.on('results', function(data){
	console.log(util.inspect(data.results.final));
});