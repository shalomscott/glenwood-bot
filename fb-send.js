'use strict';

const fetch = require('node-fetch');

const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
if (!FB_PAGE_TOKEN) throw Error('missing FB_PAGE_TOKEN');

module.exports = {
	text: sendText
}

function sendPayload(id, payload)
{
	const body = JSON.stringify(Object.assign({ recipient: { id } }, payload));
	const qs = 'access_token=' + encodeURIComponent(FB_PAGE_TOKEN);
	return fetch('https://graph.facebook.com/me/messages?' + qs, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body
	})
	.then(res => res.json())
	.then(json => {
		if (json.error && json.error.message) {
			throw Error(json.error.message);
		}
		return json;
	});
}

function sendText(id, text)
{
	const payload = { message: { text } };
	return sendPayload(id, payload);
}
