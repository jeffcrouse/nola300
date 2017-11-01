var SpeechToText = require('../modules/SpeechToText');

const util = require('util');

// var active = false;
// var FootPedal = require('./modules/FootPedal')
// FootPedal.on("press", function(date){
// 	if(active) {
// 		SpeechToText.stop();
// 	} else {
// 		SpeechToText.start();
// 	}
// });


SpeechToText.start();
SpeechToText.on("sentence", function(sentence){
	console.log(sentence.text);
	//console.log(util.inspect(sentence, {depth: 5}));
});