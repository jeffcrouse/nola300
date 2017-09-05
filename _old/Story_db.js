require('dotenv').config({ silent: true }); 
var debug = require('debug')('story');
var mongoose = require('mongoose');
const path = require('path');
var Schema = mongoose.Schema;
const mkdirp = require('mkdirp');

mkdirp(process.env.STORY_STORAGE_ROOT, debug);


var SentenceSchema = Schema({
	text: 		{ type: String, required: true },
	nlu: 		{ type: Schema.Types.Mixed, default: null }
});

var EntitiesSchema = Schema({
	places: 		[ { type: String } ],
	items: 			[ { type: String } ],
	themes: 		[ { type: String } ]
});

var StorySchema = Schema({
	createdAt:  	{ type: Date, default: Date.now },

	name: 			{ 
						first: 	{ 
							type: String,
							minlength: [2, 'First name must be at least 2 characters.'],
							maxlength: [20, 'FIrst name must be less than 20 characters.'],
							required: [true, 'Your username cannot be blank.'],
							trim: true,
						},
						last: 	{ 
							type: String,
							minlength: [2, 'First name must be at least 2 characters.'],
							maxlength: [20, 'First name must be less than 20 characters.'],
							required: [true, 'Your username cannot be blank.'],
							trim: true,
						},
	},

	email: 			{ type: String },

	entities: 		{ type: EntitiesSchema, default: EntitiesSchema },

	record:  		{ 
						start: 	{ type: Date, default: null },
						end: 	{ type: Date, default: null }
	},

	shortID: 		{ type: String, default: null },
	footage: 		[ { type: String } ],
	sentences: 		[ SentenceSchema ]
});


var lean = function(doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
}

if (!StorySchema.options.toObject) StorySchema.options.toObject = {};
StorySchema.options.toObject.transform = lean;

if (!StorySchema.options.toJSON) StorySchema.options.toJSON = {};
StorySchema.options.toJSON.transform = lean;


// ----------------------------------------------------------
StorySchema.path('entities').validate(function(entities){
	var total = entities.places.length + entities.items.length + entities.themes.length;
	return total > 1;
}, 'Please provide a few places, items, or themes');

// ----------------------------------------------------------
StorySchema.path('email').validate(function (email) {
   var emailRegex = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
   return emailRegex.test(email); // Assuming email has a text attribute
}, 'Please provide a valid email address');


// ----------------------------------------------------------
StorySchema.pre('save', function(next) {
	if(this.shortID) return next();

	mongoose.model('Story').find({}).select("shortID").exec((err, ids) => {
		used_ids = ids.map(function(id){ return id.shortID; });
		var id = null;
		do {
			id = makeID(6);
		} while(used_ids.indexOf(id) != -1);
		this.shortID = id;
		next();
	});
});

// ----------------------------------------------------------
function makeID(len) {
	var text = "";
	var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
	for(var i=0; i < len; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	return text;
}


// ----------------------------------------------------------
StorySchema.methods.saveDataFile = function() {
	return new Promise((resolve, reject) => {
		mkdirp(this.dir, function(err){
			var data_file = path.join(this.directory(), "data.json");
			fs.writeFile(data_file, this.toJSON(), 'utf8', function(err){
				if(err) return reject(err);
				else resolve();
			});
		});
	});
}

// ----------------------------------------------------------
StorySchema.methods.directory = function() {
	return path.join(process.env.STORY_STORAGE_ROOT, this.shortID); 
}

// ----------------------------------------------------------
StorySchema.methods.videoPath = function(camID) {
	var filename = "vid_" + camID + ".mp4";
	return path.join( this.directory(), filename);
}

// ----------------------------------------------------------
StorySchema.methods.populateFromForm = function(data) {
	this.name.first = data.fname;
	this.name.last = data.lname;
	this.email = data.email;

	if(data.places) 	this.entities.places = data.places;
	if(data.items) 		this.entities.items = data.items;
	if(data.themes) 	this.entities.themes = data.themes;
}

// ----------------------------------------------------------
StorySchema.methods.addSentence = function(sentence) {
	this.sentences.push(sentence);
};

// ----------------------------------------------------------
StorySchema.methods.zip = function() {

}

// ----------------------------------------------------------
StorySchema.methods.upload = function() {
	
}

// ----------------------------------------------------------
StorySchema.statics.list = function(cb) {
    this.find().limit( 20 ).exec( function( err, stories ) {
        if( err ) return cb( err );
        cb(null, stories);
    });
};


// ----------------------------------------------------------
StorySchema.statics.loadFromShortID = function(shortID){

}

// ----------------------------------------------------------
StorySchema.statics.getNewestStory = function() {
	return new Promise((resolve, reject) => {
		mongoose.model('Story').find({}).sort({createdAt: -1}).limit(1).exec((err, docs)=>{
			if(err) reject(err);
			else resolve(docs[0]);
		});
	});
};

module.exports = mongoose.model( 'Story', StorySchema, 'stories' );
