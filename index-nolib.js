/**
 * This is no library version of this program, but can give broken result.
 * Please use index.js (library version) instead of this. This version was deprecated.
 * @deprecated
 */

const fs = require('fs');
const htmlList = fs.readdirSync('./html').map(e => e.startsWith('messages') ? e : '').filter(Boolean);
let result = [];

htmlList.forEach(fn => {
	let html = fs.readFileSync(`./html/${fn}`).toString().split(/[\r\n]+/g).map(e => e.trim());
	let name = null, text = '', photo = null, date = 0, id = 0, forwarded_chat = {}, nextData = null;
	let fName = null, fText = '', fPhoto = null, fDate = 0, fNextData = null;
	html.forEach(l => {
		if(l.startsWith('<div class="message default')) {
			if(id) {
				if(date) result.push({ id, name, text, photo, date, forwarded_chat });
				else throw new Error(`Date missing! Id: ${id}, Name: ${name}, Text: ${text}`);
			}
			forwarded_chat = {};
			id = Number(l.match(/id="message(\d*)"/)[1]);
			return;
		}

		if(nextData !== 'forwarded') {
			if(l.startsWith('<div class="pull_right date')) {
				date = parseDate(l.match(/title="(.*?)"/)[1]);
				if(!date) {
					console.error(new Date(l.match(/title="(.*?)"/)[1]));
					throw new Error(`date is not valid value!`);
				}
				return;
			}
			if(l === '<div class="from_name">') {
				nextData = 'name';
				return;
			}
			if(l === '<div class="text">') {
				text = '';
				photo = null;
				nextData = 'text';
				return;
			}
		}
		if(l.startsWith('<img class="photo"')) {
			text = null;
			photo = l.match(/src="photos\/(.*?)"/)[1];
			return;
		}
		if(l === '<div class="forwarded body">') {
			nextData = 'forwarded';
			return;
		}
		if(nextData) {
			switch(nextData) {
				case 'name': name = l; break;
				case 'text': {
					if(l === '</div>') {
						text = text.replace(/<br>/g, '\n').replace(/<a href=\"https:\/\/t\.me\/(.*?)\">@\1<\/a>/g, '@$1');
						nextData = null;
						return;
					}
					text += l;
					return;
				} break;
				case 'forwarded': {
					if(l === '<div class="from_name">') {
						fNextData = 'name';
						return;
					}
					if(l === '<div class="text">') {
						fText = '';
						fPhoto = null;
						fNextData = 'text';
						return;
					}
					if(l.startsWith('<img class="photo"')) {
						fText = null;
						fPhoto = l.match(/src="photos\/(.*?)"/)[1];
						return;
					}
					if(fNextData) {
						switch(fNextData) {
							case 'name': {
								l.replace(/(.*?) <span class="details">(.*?)<\/span>/, (m, p1, p2) => {
									fName = p1;
									fDate = parseDate(p2.trim());
									if(!fDate) {
										console.error(p2.trim());
										throw new Error(`fDate is not valid value!`);
									}
								});
								fNextData = null;
								return;
							} break;
							case 'text': {
								if(l === '</div>') {
									fText = fText.replace(/<br>/g, '\n').replace(/<a href=\"https:\/\/t\.me\/(.*?)\">@\1<\/a>/g, '@$1');
									fNextData = null;
									return;
								}
								fText += l;
								return;
							} break;
							default: throw new Error(`This fData type not defined: Please report this error to developer. fData type: ${nextData}`);
						}
					}
					forwarded_chat = { fName, fText, fPhoto, fDate };
					return;
				} break;
				default: throw new Error(`This data type not defined: Please report this error to developer. Data type: ${nextData}`);
			}
			nextData = null;
			return;
		}
	});
});

function parseDate(date) {
	let year = date.split(' ')[0].split('.')[2], month = date.split(' ')[0].split('.')[1], day = date.split(' ')[0].split('.')[0], time = date.split(' ')[1];
	return Number(new Date(`${year}-${month}-${day} ${time}`));
}

fs.writeFileSync('./result.json', JSON.stringify(result, null, '\t'));
