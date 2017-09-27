require('dotenv').config({ silent: true }); 
var fs = require('fs');
const util = require('util');
const SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
const spawn = require('child_process').spawn;



var on_listening = function(data) {
	console.log("listening")
}
var on_data = function(data) {
	console.log(data);
}
var on_results = function(data) {
	//console.log(util.inspect(data, 10));
}
var on_close = function() {
	console.log("closing");
}

const stt = new SpeechToTextV1();
var recognizeStream = stt.createRecognizeStream({ content_type: 'audio/wav' });
recognizeStream.setEncoding('utf8');
recognizeStream.on('listening', on_listening);
recognizeStream.on('data', on_data);
recognizeStream.on('results', on_results);
recognizeStream.on('close', on_close);



  
var proc = spawn('rec', ['-b', 16, '--endian', 'little', '-c', 1, '-r', 16000, '-e', 'signed-integer', '-t', 'wav', '-']);
proc.on('exit', function(code, sig) {
	console.log(`proc has exited with code = ${code}`);
});
proc.stderr.on('data', (data) => {
	//console.log(`stderr: ${data}`);
});
proc.stdout.pipe(recognizeStream);


console.log("test");