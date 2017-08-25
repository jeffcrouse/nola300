var mongoose = require('mongoose');
const path = require('path');
var Schema = mongoose.Schema;

var SentenceSchema = Schema({
	text: 		{ type: String, required: true },
	nlu: 		{ type: Schema.Types.Mixed, default: null }
});

var StorySchema = Schema({
	createdAt:  	{ type: Date, default: Date.now },

	name: 			{ 
						first: 	{ type: String, required: true },
						last: 	{ type: String, required: true },
	},

	email: 			{ type: String, required: true },

	locations: 		[ { type: String } ],			// TO DO: validate that at least 1 location, item, or theme is chosen
	items: 			[ { type: String } ],
	themes: 		[ { type: String } ],

	recordStart:  	{ type: Date, default: null },
	recordEnd:  	{ type: Date, default: null },

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
StorySchema.methods.assignShortID = function() {

	return new Promise((resolve, reject) => {
		if(this.shortID) return resolve(this.shortID);

		mongoose.model('Story').getUsedIDs().then((used_ids) => {
			do {
				this.shortID = makeID(6);
			} while(used_ids.indexOf(this.shortID)!=-1);
			resolve(this.shortID);
		}).catch(reject);
	});
}

// ----------------------------------------------------------
StorySchema.methods.getVideoPath = function(camID) {

	var filename = ["vid", this.shortID, camID].join("_") + ".mp4";
	var fullpath = path.join(process.env.VIDEO_STORAGE_ROOT, filename); 
	return fullpath;
}

// ----------------------------------------------------------
StorySchema.methods.addSentence = function(sentence) {

  	return new Promise((resolve, reject) => {
  		this.sentences.push(sentence);
  		// TODO: save model?
  	});
};

// ----------------------------------------------------------
StorySchema.statics.list = function(cb) {
    this.find().limit( 20 ).exec( function( err, stories ) {
        if( err ) return cb( err );
        cb(null, stories);
    });
};


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
