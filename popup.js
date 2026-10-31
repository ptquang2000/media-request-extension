const tableBody = document.getElementById("tbody-id");
const exportBtn = document.getElementById("btn-export");
const clearBtn = document.getElementById("btn-clear");
const exportStatus = document.getElementById("export-status");

const SetExportStatus = (message) => {
	if (exportStatus) exportStatus.textContent = message;
};

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

	// Per-OS filesystem limits that apply to the exported out= names.
	// The input file has no dir= entry: aria2c is run from the browser download
	// folder with only one filename component written per media item, so both a
	// total-path cap (Windows MAX_PATH) and a component cap (255 on all OSes) matter.
	const getPathLimits = (platform) => {
		if (platform === 'windows') {
			return {
				// NTFS caps each path component (the out= file itself) at 255 chars.
				maxFilenameLength: 255,
				// aria2c is not long-path aware, so MAX_PATH (260) still applies: the
				// download folder, e.g. C:\Users\<user>\Downloads, consumes part of it.
				// Reserve 30 chars for that folder and budget the rest for the name.
				maxPathLength: 260 - 30
			};
		}
		// Linux (ext4) and macOS (APFS/HFS+): no practical total-path limit.
		return { maxFilenameLength: 255, maxPathLength: null };
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
	const limits = getPathLimits(platform);
	// Longest usable name before the final extension is appended
	let maxNameLength = limits.maxFilenameLength - finalExtension.length;
	if (limits.maxPathLength !== null) {
		maxNameLength = Math.min(maxNameLength, limits.maxPathLength - finalExtension.length);
	}

	mediaUrls.forEach(mediaUrl => {
		let fileName = normalizeFilename(mediaUrl.title);
		// Account for final extension length
		if (fileName.length > maxNameLength) {
			fileName = fileName.substring(0, maxNameLength);
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
	if (!mediaUrls || mediaUrls.length === 0) {
		SetExportStatus("No media URLs to export.");
		return;
	}

	// Export goes through the background script so browser.downloads.download()
	// can open the Save As file picker (saveAs: true). The blob URL is kept
	// alive there until the download completes, which is required on Firefox.
	runtime.sendMessage({
		type: EXPORT_ARIA2_INPUT,
		filename: ARIA2_INPUT_FILENAME,
		data: GenerateAria2Input(mediaUrls)
	});
	SetExportStatus("Choose a save location in the file picker.");
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
