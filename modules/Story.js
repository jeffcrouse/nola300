require('dotenv').config({ silent: true }); 
var debug = require('debug')('story');
const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');


mkdirp(process.env.STORY_STORAGE_ROOT, debug);



function makeID(len) {
	var text = "";
	var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
	for(var i=0; i < len; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	return text;
}



// ------------------------------------------
var Story = function(id) {
	
	this.name = {first: null, last: null};
	this.email = null;
	this.entities = {places: [], items: [], themes: []};
	this.createdAt = Date.now();
	this.session = { 
		start: null, 
		end: null, 
		sentences: [], 
		footage: [] 
	};

	if(id) {
		this.id = id;
	} else {
		this.id = makeID(6);
	}

	this.dir = path.join(process.env.STORY_STORAGE_ROOT, this.id);
}




// ------------------------------------------
Story.prototype.load = function(id) {
	return new Promise((resolve, reject) => {
		this.dir = path.join(process.env.STORY_STORAGE_ROOT, this.id);
		var data_file = path.join(this.dir, "data.json");

		fs.readFile(data_file, 'utf8', function (err, data) {
		    if (err) return reject(err);
		    try {
		    	var obj = JSON.parse(data);
		    	return this.populate(obj);
		    } catch() {
		    	reject();
		    }
		});
	});
}



// ------------------------------------------
Story.prototype.toJSON = function() {
	var obj = {};
	obj.id = this.id;

	return obj.stringify();
}


// ------------------------------------------
Story.prototype.save = function() {
	return new Promise((resolve, reject) => {
		mkdirp(this.dir, function(err){
			var data_file = path.join(this.dir, "data.json");
			fs.writeFile(data_file, this.toJSON(), 'utf8', function(err){
				if(err) return reject(err);
				else resolve();
			});
		});
	});
}

// ------------------------------------------
// TODO: THis is being used both by the server route and the load function, but they both pass in different kinds of structures. BEWARE!
Story.prototype.populate = function(data, save) {

	return new Promise((resolve, reject) => {

		this.name.first = data.fname;
		this.name.last = data.lname;
		this.email = data.email;

		if(data.places) 	this.entities.places = req.body.places;
		if(data.items) 		this.entities.items = req.body.items;
		if(data.themes) 	this.entities.themes = req.body.themes;

		if(save) {
			return save();
		} 

		resolve();

	});
}



module.exports = Story;