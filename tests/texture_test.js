require('dotenv').config({ silent: true }); 
var glob = require('glob');
const fs = require('fs');
const async = require('async');
const path = require('path');



var textures = {};
var emotions = ["anger", "disgust", "fear", "intro", "joy", "sadness"];
async.each(emotions, (item, done) => {
	var pattern = process.env.TEXTURE_ROOT + "/" + item.toUpperCase() + "*.mp4";
	glob(pattern, (err, files) => {
		textures[item] = files;
		done(null);
	});
}, (err) => {
	console.log(textures);
});