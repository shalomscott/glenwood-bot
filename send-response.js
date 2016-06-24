"use strict";

const request = require('request');

// Environment variable set to app token
var token = process.env.FB_TOK;

function send(recip, messageData) {
	request(
		{
			url: 'https://graph.facebook.com/v2.6/me/messages',
			qs: { access_token: token },
			method: 'POST',
			json: {
				recipient: { id: recip },
				message: messageData
			}
		},
		(error, response, body) => {
			if (error) {
				console.log('Error sending message:  ', error);
			} else if (response.body.error) {
				console.log('Error:  ', response.body.error);
			}
		});
}

function sendText(recip, text) {
	var textData = {
		text: text
	};
	send(recip, textData);
}

function sendImage(recip, url) {
	var imageData = {
		attachment: {
			type: "image",
			payload: {
				url: url
			}
		}
	};
	send(recip, imageData);
}

// doesn't work properly at the moment
function sendMenu(recip) {
	var menuData = {
		attachment: {
			type: "template",
			payload: {
				template_type: "button",
				text: "What would you like to know?",
				buttons: [
					{
						type: "postback",
						title: "This week's Parsha",
						payload: "parsha"
					},
					{
						type: "postback",
						title: "When Mincha is",
						payload: "mincha"
					},
					{
						type: "postback",
						title: "Zmanim",
						payload: "zmanim"
					}]
			}
		}
	};
	send(recip, menuData);
}

module.exports = {
	menu: sendMenu,
	text: sendText,
	image: sendImage
};
