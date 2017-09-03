require('dotenv').config({ silent: true }); 
var debug = require('debug')('story');
const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = require('child_process').exec;
var validator = require('validator');
var _ = require('underscore');



mkdirp(process.env.STORY_STORAGE_ROOT, debug);

function makeID(len) {
	var text = "";
	var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
	for(var i=0; i < len; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	return text;
}


// ------------------------------------------
// "private" constructor. Use "load" or "create" to make a Story
var Story = function() { 
	this.id = null;
	this.name = {first: null, last: null};
	this.email = null;
	this.createdAt = Date.now();
	this.entities = {places: [], items: [], themes: []};
	this.session = { 
		start: null, 
		end: null, 
		sentences: [], 
		footage: [] 
	};
};


// ------------------------------------------
Story.create = function(data) {
	return new Promise((resolve, reject) => {
		var story = new Story();

		story.id = makeID(8);
		story.name.first = data.fname;
		story.name.last = data.lname;
		story.email = data.email;

		if(data.places) 	story.entities.places = data.places;
		if(data.items) 		story.entities.items = data.items;
		if(data.themes) 	story.entities.themes = data.themes;

		var errors = story.validate();
		if(errors.length == 0) {
			return resolve(story);
		} else {
			return reject(errors);
		}
	});
}


// ------------------------------------------
Story.load = function(id) {
	return new Promise((resolve, reject) => {

		var data_file = path.join(process.env.STORY_STORAGE_ROOT, id, "data.json");

		fs.stat(data_file, (err, stats) => {
			if (err) {
				if(err.errno === 34) resolve(null);
				else reject(err);
			} else {
				fs.readFile(data_file, 'utf8', function (err, data) {
					if (err) return reject(err);
					try {
						var obj = JSON.parse(data);
						var story = new Story();

						story.id = obj.id;
						story.name = obj.name;
						story.email = obj.email;
						story.entities = obj.entities;
						story.createdAt = obj.createdAt;
						story.session = obj.session;

						return resolve(story);
					} catch(e) {
						reject(e);
					}
				});
			}
		});
	});
}


// ------------------------------------------
Story.prototype.validate = function() {
	debug("validating", this);

	var errors = [];

	if(!this.id || this.id.length != 8) {
		errors.push("Invalid story ID. Something went wrong.")
	}
	if(!validator.isLength(this.name.first, {min:2, max: 20})) {
		errors.push("Please provide a valid first name.")
	}
	if(!validator.isLength(this.name.last, {min:2, max: 30})) {
		errors.push("Please provide a valid last name.")
	}
	if(!validator.isEmail(this.email)) {
		errors.push("Please provide a valid email address");
	}
	if(!this.createdAt) {
		errors.push("createdAt is required.");
	}

	var num_entities = this.entities.places.length + this.entities.themes.length + this.entities.items.length;
	if(num_entities < 3) {
		errors.push("Please provide at least 3 places, items, or themes in total.");
	}

	return errors;
}

// ------------------------------------------
Story.prototype.path = function() {
	return path.join(process.env.STORY_STORAGE_ROOT, this.id);
}


// ------------------------------------------
Story.prototype.save = function() {
	return new Promise((resolve, reject) => {
		mkdirp(this.path(), err => {
			if(err) return reject(err);

			var data_file = path.join(this.path(), "data.json");
			fs.writeFile(data_file, this.toJSON(), 'utf8', err => {
				if(err) return reject(err);
				else resolve(this);
			});
		});
	});
}


// ------------------------------------------
Story.prototype.toJSON = function() {
	var obj = _.pick(this, ['id', 'name', 'email', 'createdAt', 'entities', 'session']);
	return JSON.stringify(obj, null, 4);
}

// ----------------------------------------------------------
Story.prototype.getVideoPath = function(camID) {
	var filename = "vid_"+camID+".mp4";
	return path.join(this.path(), filename);
}

// ----------------------------------------------------------
Story.prototype.addSentence = function(sentence) {
	this.session.sentences.push(sentence);
};

// ----------------------------------------------------------
Story.prototype.zip = function() {
	return new Promise((resolve, reject) => {
		var cmd = util.format("tar -zcvf %s.tar.gz %s", this.path(), this.path());
		debug(cmd);
		exec(cmd, function(err){
			if(err) return reject(err);
			resolve();
		})
	});
}

// ----------------------------------------------------------
Story.prototype.upload = function() {
	return new Promise((resolve, reject) => {
		resolve();
	});
}

// ----------------------------------------------------------
// Mark this story as "ready to zip and upload"
Story.prototype.finish = function() {
	return this.save().then(this.zip).then(this.upload);
}



module.exports = Story;