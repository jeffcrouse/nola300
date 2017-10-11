const util = require('util');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('state');


var StateManager = function(initial) {

	EventEmitter.call(this);

	var _state = null;

	this.set = (new_state) => {
		debug("state_change", _state, new_state);
		this.emit("state_change", _state, new_state);
		_state = new_state;
	}

	this.get = () => {
		return _state;
	}

	this.is = (other_state) => {
		return _state == other_state;
	}

	this.set(initial);
}


util.inherits(StateManager, EventEmitter);

module.exports = StateManager;