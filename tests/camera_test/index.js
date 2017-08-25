const util = require('util');
var mongoose = require('mongoose');
var CanonCamera = require('./CanonCamera');
var SpeechToText = require('./SpeechToText');
var FootPedal = require("./FootPedal");
var Story = require('./Story');

mongoose.connect('mongodb://localhost/nola300', {useMongoClient: true});


var recording = false;

var cam0 = new CanonCamera(1);
var cam1 = new CanonCamera(0);

var story = null;


FootPedal.on("press", function(date){

	if(recording) {
		var path_cam0 = story.getVideoPath(0);
		var path_cam1 = story.getVideoPath(1);

		Promise.all([SpeechToText.stop(), cam0.stop(path_cam0), cam1.stop(path_cam1)]).then( () => {

			story.recordEnd = Date.now();
			story.footage = [path_cam0, path_cam1];
			story.save(function(err){
				if(err) console.log(err);
				else console.log("done!");
			});

			recording = false;

		}).catch(console.error);
	} else {

		Story.getNewestStory().then((_story) => {

			story = _story;
			story.recordStart = Date.now();

			var actions = [SpeechToText.start(), cam0.record(), cam1.record()];
			Promise.all(actions).then(()=>{
				recording = true;
			}).catch(console.error);

		}).catch(console.err);
	}
});

SpeechToText.on("sentence", function(sentence){
	console.log(util.inspect(sentence, {depth: 10}));
	story.addSentence( sentence );
});



process.on('SIGINT', function() {
	Promise.all([FootPedal.close(), cam0.close(), cam1.close()]).then(()=>{
		process.exit();
	}).catch(console.error);
});
