const fs = require('fs'), es = require('event-stream');
const htmlList = fs.readdirSync('./html').map(e => e.startsWith('messages') ? e : '').filter(Boolean);
let result = [];

htmlList.forEach(fn => {
	let ln = 0;
	let name = null, text = '', photo = null, date = 0, id = 0, forwarded_chat = {}, nextData = null;
	let fName = null, fText = '', fPhoto = null, fDate = 0, fNextData = null;
	let s = fs.createReadStream(`./html/${fn}`).pipe(es.split()).pipe(es.mapSync(l => {
		if(!(l = l.trim())) return;
		ln++;
		if(l.startsWith('<div class="message default')) {
			if(id) {
				if(!date) throw new Error(`Date missing! Id: ${id}`);
				if(!name) throw new Error(`Name missing! Id: ${id}`);
				if(!id) throw new Error(`Id missing! Filename: ${fn}`);
				if(!text && !photo && !forwarded_chat) throw new Error(`Value missing! Id: ${id}`);

				result.push({ id, name, text, photo, date, forwarded_chat });
			}
			id = date = fDate = 0;
			photo = nextData = fName = fPhoto = fNextData = null;
			text = '';
			forwarded_chat = {};
			return id = Number(l.match(/id="message(\d*)"/)[1]);
		}

		if(nextData !== 'forwarded') {
			if(l.startsWith('<div class="pull_right date')) return date = parseDate(l.match(/title="(.*?)"/)[1]);
			if(l === '<div class="from_name">') return nextData = 'name';
			if(l === '<div class="text">') return nextData = 'text';

			if(l === 'Photo') return text = '(Photo found, but not included in exported data.)';
			if(l.startsWith('<img class="photo"')) {
				text = '(Photo)';
				return photo = l.match(/src="photos\/(.*?)"/)[1];
			}

			if(l === 'Sticker') return text = '(Sticker found, but not included in exported data.)';
			if(l.startsWith('<img class="sticker"')) {
				text = '(Sticker)';
				return photo = l.match(/src="stickers\/(.*?)"/)[1];
			}

			if(l === '<div class="forwarded body">') return nextData = 'forwarded';
		}

		if(nextData) {
			switch(nextData) {
				case 'name': {
					nextData = null;
					return name = l;
				};
				case 'text': {
					if(l === '</div>') {
						nextData = null;
						return text = text.replace(/<br>/g, '\n').replace(/<a href=\"https:\/\/t\.me\/(.*?)\">@\1<\/a>/g, '@$1').replace(/<a href=\"(.*?)">\1<\/a>/g, '$1');
					}
					return text += l;
				}

				case 'forwarded': {
					if(l === '<div class="from_name">') return fNextData = 'name';
					if(l === '<div class="text">') return fNextData = 'text';

					if(l === 'Photo') return fText = '(Photo found, but not included in exported data.)';
					if(l.startsWith('<img class="photo"')) {
						fText = '(Photo)';
						return fPhoto = l.match(/src="photos\/(.*?)"/)[1];
					}

					if(l === 'Sticker') return fText = '(Sticker found, but not included in exported data.)';
					if(l.startsWith('<img class="sticker"')) {
						fText = '(Sticker)';
						return fPhoto = l.match(/src="stickers\/(.*?)"/)[1];
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
								return fNextData = null;
							}

							case 'text': {
								if(l === '</div>') {
									fNextData = null;
									return fText = fText.replace(/<br>/g, '\n').replace(/<a href=\"https:\/\/t\.me\/(.*?)\">@\1<\/a>/g, '@$1').replace(/<a href=\"(.*?)">\1<\/a>/g, '$1');
								}
								return fText += l;
							}
							default: throw new Error(`This fData type not defined: Please report this error to developer. fData type: ${nextData}`);
						}
					}

					if(fName && (fText || fPhoto) && fDate) {
						nextData = fNextData = null;
						return forwarded_chat = { fName, fText, fPhoto, fDate };
					}
					;
				} break;
				default: throw new Error(`This data type not defined: Please report this error to developer. Data type: ${nextData}`);
			}
			nextData = null;
			return;
		}
	})).on('end', () => {
		if(fn === htmlList[htmlList.length - 1]) fs.writeFileSync('./result.json', JSON.stringify(result.sort((e1, e2) => (e1.id > e2.id) ? 1 : ((e1.id < e2.id) ? -1 : 0)), null, '\t'));
	});
});

function parseDate(date) {
	return Number(new Date(`${date.split(' ')[0].split('.')[2]}-${date.split(' ')[0].split('.')[1]}-${date.split(' ')[0].split('.')[0]} ${date.split(' ')[1]}`));
}
