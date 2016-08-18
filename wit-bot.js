'use strict';

const {Wit, log} = require('node-wit');
const weekday = require('./weekday');

// Wit.ai parameters
const WIT_TOKEN = process.env.WIT_TOKEN;
if (!WIT_TOKEN) throw Error('missing WIT_TOKEN');

// Setting up our bot
const wit = new Wit({
	accessToken: WIT_TOKEN,
	actions,
	logger: new log.Logger(log.INFO)
});

// Adding a method onto wit object
wit.process = function(fbid, text) {
	const ssid = getSessionID(fbid);
	return this.runActions(ssid, text);
}

// Exports our slightly modified Wit object
module.exports = wit;


// ----- [ Session Managing ] -----

// 'sessions' maps an existing session ID to an fbid and context object.
// Key/value pairs are: sessionId -> { fbid, context }
const sessions = {};

// Gets or creates a sessionId corresponding to the fbid
function getSessionID(fbid)
{
	for (let key in sessions) {
		if (sessions[key].fbid === fbid)
			return key; // the active sessionId
	}

	// No session found for user fbid, creating a new one
	let sessionId = new Date().toISOString();
	sessions[sessionId] = { fbid, context: {} };
	return sessionId;
}


// ----- Bot Code -----

// Bot's actions
const actions = {
	send({sessionId}, {text})
	{
		return Promise.resolve({ text });
	},
	// Retrieves a week segment from 'weekday/*.json' and stores it on the context object
	weekday_search_by_date({sessionId, entities, context})
	{
		context = Object.assign(sessions[sessionId].context, context, entities);
		return weekday.byDate(context.datetime && context.datetime[0].value)
		.then(week => ({week}));
	},
	weekday_search_by_parsha({sessionId, entities, context})
	{
		context = Object.assign(sessions[sessionId].context, context, entities);
		return weekday.byParsha(context.datetime && context.datetime[0].value)
		.then(week => ({week}));
	},
	weekday_get_time({sessionId, entities, context})
	{
		let {time, week, datetime} =
			Object.assign(sessions[sessionId].context, context, entities);
		if (time) {
			if (!week)
				throw Error('No week object received.');
			time = (time[0].value);
			let date = datetime && datetime[0].value;
			//delete sessions[sessionId]; // REVIEW
			return Promise.resolve({
				time: time.charAt(0).toUpperCase() + time.slice(1), // Uppercase the 'time'
				timeRes: weekday.getProp(week, time, date) // TODO: weekday needs changing
			});
		}
		return Promise.resolve({noTime: true});
	},
	weekday_get_parsha({sessionId, entities, context})
	{
		let {parsha, week, datetime} =
			Object.assign(sessions[sessionId].context, context, entities);
		if (parsha) {
			if (!week)
				throw Error('No week object received.');
			let date = datetime && datetime[0].value;
			//delete sessions[sessionId]; // REVIEW
			return Promise.resolve({
				parshaRes: weekday.getProp(week, 'parsha', date) // TODO: weekday needs changing
			});
		}
		return Promise.resolve({noParsha: true}); // REVIEW
	}
	// TODO: implement actions here
}
