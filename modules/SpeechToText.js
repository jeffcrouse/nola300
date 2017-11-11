require('dotenv').config({ silent: true }); 
var debug = require('debug')('stt');
const SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1');
const util = require('util');
var EventEmitter = require('events').EventEmitter;
const spawn = require('child_process').spawn;
var Sentence = require('./Sentence.js')
var _ = require('lodash');
var which = require('which');


var rec = "rec";
which('rec', function (err, resolvedPath) {
	if(err) throw err;
 	rec = resolvedPath;
});


const stt = new SpeechToTextV1();
var nlu = new NaturalLanguageUnderstandingV1({
	version_date: NaturalLanguageUnderstandingV1.VERSION_DATE_2017_02_27
});

// features to fetch from Watson NLU
// https://github.com/watson-developer-cloud/node-sdk/blob/master/natural-language-understanding/v1.js
var features = { concepts: {}, emotion: {}, entities: {}, keywords: {}, sentiment: {} };


var SpeechToText = function() {
	EventEmitter.call(this);

	var self = this;

	var recognizeStream = null;
	var running = false;
	var startTime = null;
	var proc = null;


	/**
	*	"rec" is a program that comes with "sox"
	*	This function opens a websocket stream to Watson, and then spawns a process of "rec", 
	*	which we then pipe directly into the websocket 
	*/
	this.start = function(callback) {
		callback = callback || function(){}
		if(running) return callback("already running");

		recognizeStream = stt.createRecognizeStream({content_type: 'audio/mp3'});
		recognizeStream.setEncoding('utf8');
		recognizeStream.on('listening', on_listening);
		recognizeStream.on('data', on_data);
		//recognizeStream.on('results', on_results);
		recognizeStream.on('error', on_error);
		recognizeStream.on('close', on_close);

		// TODO: Can I make this lower quality?
		debug("spawning rec");
		var args = ['--endian', 'little', '-t', 'mp3', '-C', '128', '-'];
		proc = spawn(rec, args);
		debug(rec, args);
		proc.on('exit', (code, sig) => {
			debug(`recProc has exited with code = ${code}`);
		});

		//proc.stderr.on('data', (data) => {  });
		proc.stdout.pipe(recognizeStream);

		startTime = Date.now();
		running = true;

		debug("started");
		callback();
	}

	// --------------------------------------------------------------------
	this.stop = function(callback) {	
		callback = callback || function(){}

		if(!running) {
			debug("[warning] not running");
			return callback();
		}

		debug("closing");

		proc.kill('SIGTERM');

		recognizeStream.stop();

		startTime = null;
		running = false;

		debug("done");
		callback();
	}


	// --------------------------------------------------------------------
	var on_listening = function(data) {
		debug("listening")
	}
	

	/**
	*	THis function gets called whenever Watson returns word data from the recognizeStream
	*/
	var on_data = function(data) {
		var now = Date.now();

		data = data.replace("%HESITATION", "");

		var sentence = new Sentence(data);

		if(startTime) {
			sentence.elapsed = now - startTime;
		} else {
			debug("Warning: received a sentence when SpeechToText was not runnning");
		}
		
		if(sentence.wordcount() < 3) {
			debug("less than 3 words");
			self.emit("sentence", sentence);
			return;
		} else {
			var options = { text: data, features: features };
			nlu.analyze(options, function(err, res) {
				if(!err) {
					sentence.nlu = _.pick(res, ["sentiment", "keywords", "entities", "emotion", "concepts"]);
				}
				self.emit("sentence", sentence);
			});
		}
	}
	
	// --------------------------------------------------------------------
	var on_results = function(data) {
		//console.log("[SpeechToText] results ", util.inspect(data));
	}

	// --------------------------------------------------------------------
	var on_close = function() {
		debug("on_close");
	}

	// --------------------------------------------------------------------
	var on_error = function(err) {
		debug("on_error", err);
	}
}


util.inherits(SpeechToText, EventEmitter);
module.exports = new SpeechToText();