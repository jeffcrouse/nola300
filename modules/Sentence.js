var _ = require('lodash');



/**
*	A wrapper for the transcription text that comes back from Watson, some time info, and the 
*	nagtural language processing data that also comes from Watson. This gets emitted 
*/
var Sentence = function(text) {

	this.nlu = null;
	this.elapsed = null;
	this.time = null;
	this.text = text;

	/**
	*	Get the middle 1/3 of the keywords.
	*/
	this.get_texture_words = function() {
		var length = this.nlu.keywords.length;
		if(length < 2) return null;
		var n = Math.floor(length / 3);
		var sliced = this.nlu.keywords.slice(n, length-n);
		return sliced.map( w => { return w.text });
	}

	this.get_search_terms = function() {
		var keywords = this.nlu.keywords || [];
		var entities = this.nlu.entities || [];
		var concepts = this.nlu.concepts || [];
		var words = _.concat(keywords, entities, concepts);
		return words;
	}

	this.wordcount = function() {
		return text.split(" ").length;
	}

	this.has_emotion = function() {
		return this.nlu && this.nlu.emotion;
	}

	// {"sadness":0.384302,"joy":0.092126,"fear":0.1159,"disgust":0.140539,"anger":0.25926}
	this.get_top_emotion = function() {
		if(!this.has_emotion()) return null;
		var emo = this.get_emotion();
		var keys_sorted = Object.keys(emo).sort((a,b) => {return emo[b]-emo[a]});
		return keys_sorted[0];
	}

	// {"sadness":0.107138,"joy":0.510527,"fear":0.088946,"disgust":0.044441,"anger":0.057538}
	this.get_emotion = function() {
		return this.nlu.emotion.document.emotion;
	}

	this.has_nlu = function() {
		return this.nlu != null;
	}

	this.toJson = function() {
		return _.pick(this, ["text", "nlu", "elapsed"]); 
	}
}

module.exports = Sentence;