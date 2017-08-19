var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var StorySchema = Schema({
    username: { type: String, required: true },
    password: { type: String }
});

// Use UserSchema.statics to define static functions
StorySchema.statics.userlist = function(cb) {
    this.find().limit( 20 ).exec( function( err, users ) 
    {
        if( err ) return cb( err );

        cb(null, users);
    });
};

module.exports = mongoose.model( 'Story', StorySchema, 'stories' );