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
	this.get_texture_words = () => {
		var length = this.nlu.keywords.length;
		if(length < 2) return null;
		var n = Math.floor(length / 3);
		var sliced = this.nlu.keywords.slice(n, length-n);
		return sliced.map( w => { return w.text });
	}

	this.get_search_terms = () => {
		var keywords = this.nlu.keywords || [];
		var entities = this.nlu.entities || [];
		var concepts = this.nlu.concepts || [];
		var words = _.concat(keywords, entities, concepts);
		return words;
	}

	this.wordcount = () => {
		return text.split(" ").length;
	}

	this.has_emotion = () => {
		return this.nlu && this.nlu.emotion;
	}

	this.get_emotion = () => {
		return this.nlu.emotion.document.emotion;
	}

	this.has_nlu = () => {
		return this.nlu != null;
	}

	this.toJson = () => {
		return _.pick(this, ["text", "nlu", "elapsed"]); 
	}
}

module.exports = Sentence;