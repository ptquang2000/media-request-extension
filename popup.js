const tableBody = document.getElementById("tbody-id");
const exportBtn = document.getElementById("btn-export");
const clearBtn = document.getElementById("btn-clear");

const DeleteURLByCriteria = (url, size) => {
	runtime.sendMessage({type: DELETE_URL_AT_INDEX, url: url, size: size}).then(() => {
		RefreshMediaTable();
	}, error => {});
};

const CreateTableRow = (index, content) => {
	let newRow = tableBody.insertRow(-1);

	let titleCell = newRow.insertCell(0);
	let titleText = document.createTextNode(content.title);
	titleCell.appendChild(titleText);

	let sizeCell = newRow.insertCell(1);
	let sizeText = document.createTextNode(content.size);
	sizeCell.appendChild(sizeText);

	let delCell = newRow.insertCell(2);
	let delBtn = document.createElement("button");
	delBtn.onclick = () => { DeleteURLByCriteria(content.url, content.size); };
	delBtn.textContent = "Del";
	delCell.appendChild(delBtn);
}

const GenerateAria2Input = (mediaUrls) => {
	const maxConnectionPerServer = 16;
	const split = 8;
	const maxConcurrentDownloads = 5;
	const finalExtension = ".mp4";

	const detectPlatform = () => {
		const platform = navigator.platform || navigator.userAgent || '';
		if (/win/i.test(platform)) return 'windows';
		if (/linux/i.test(platform)) return 'linux';
		if (/mac/i.test(platform)) return 'macos';
		return 'linux';
	};

	const getMaxFilenameLength = (platform) => {
		return 255;
	};

	const normalizeFilename = (name) => {
		if (!name) return "download";
		const platform = detectPlatform();
		let normalized = name;

		if (platform === 'windows') {
			// Windows invalid chars: \ / : * ? " < > |
			normalized = normalized.replace(/[\\/:*?"<>|]/g, ' ');
			// Avoid reserved names
			const reserved = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
			const trimmed = normalized.trim();
			if (reserved.test(trimmed)) {
				normalized = '_' + trimmed;
			} else {
				normalized = trimmed;
			}
		} else if (platform === 'linux') {
			// Linux invalid char is only / (and null)
			normalized = normalized.replace(/\//g, ' ');
		} else if (platform === 'macos') {
			// macOS invalid chars: : and /
			normalized = normalized.replace(/[/:]/g, ' ');
		}

		// Common: remove control chars and null
		normalized = normalized.replace(/[\x00-\x1f\x7f\0]/g, ' ');
		normalized = normalized.replace(/\s+/g, ' ').trim();
		return normalized || "download";
	};

	let output = "";
	const platform = detectPlatform();
	const maxLen = getMaxFilenameLength(platform);

	mediaUrls.forEach(mediaUrl => {
		let fileName = normalizeFilename(mediaUrl.title);
		// Account for final extension length
		if (fileName.length + finalExtension.length > maxLen) {
			fileName = fileName.substring(0, maxLen - finalExtension.length);
		}
		fileName = fileName.trim();
		if (!fileName) fileName = "download";
		output += `${mediaUrl.url}\n`;
		output += `\tout=${fileName}${finalExtension}\n`;
		output += `\tmax-connection-per-server=${maxConnectionPerServer}\n`;
		output += `\tsplit=${split}\n`;
		output += `\tmax-concurrent-downloads=${maxConcurrentDownloads}\n`;
	});
	return output;
};

const ExportBtnOnClick = (mediaUrls) => {
	const blob = new Blob([`${GenerateAria2Input(mediaUrls)}`], { type: "text/plain;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	window.open(url);
};

const ClearBtnOnClick = () => {
	runtime.sendMessage({type: CLEAR_ALL_URLS}).then(() => {
		RefreshMediaTable();
	}, error => {});
};

const RefreshMediaTable = () => {
	runtime.sendMessage({type: GET_MEDIA_TITLES}).then(serializedMediaUrls => 
	{
		let mediaUrls = JSON.parse(serializedMediaUrls);
		console.log(mediaUrls);

		tableBody.innerHTML = '';
		exportBtn.onclick = null;
		clearBtn.onclick = null;

		[...mediaUrls].reverse().forEach((value, index, array) => {
			CreateTableRow(index, value);
		});
		exportBtn.onclick = () => { ExportBtnOnClick(mediaUrls); };
		clearBtn.onclick = () => { ClearBtnOnClick(); };
	}, (error) => {});
};


RefreshMediaTable();
