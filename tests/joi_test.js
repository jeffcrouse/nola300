var Joi = require('joi');



const schema = Joi.object({
	id: Joi.string().length(6).required(),
	name: Joi.object({
		first: Joi.string().min(2).max(20).required(),
		last: Joi.string().min(2).max(30).required()
	}),
	entities: Joi.object({}),
	email: Joi.string().email().required(),
	createdAt: Joi.number().required()
});


var obj = {
	name: {first: "Jeff"},
	email: "jeff"
};



const result = Joi.validate(obj, schema, {abortEarly: false}); 

console.log(result.error.details);