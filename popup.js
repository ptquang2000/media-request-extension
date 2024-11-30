const tableBody = document.getElementById("tbody-id");
const exportBtn = document.getElementById("btn-export");
const clearBtn = document.getElementById("btn-clear");

const DeleteURLByIndex = (index) => {
	runtime.sendMessage({type: DELETE_URL_AT_INDEX, index: index}).then(() => {
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
	delBtn.onclick = () => { DeleteURLByIndex(index); };
	delBtn.textContent = "Del";
	delCell.appendChild(delBtn);
}

const GenerateAria2Input = (mediaUrls) => {
	const aria2Ext = ".mp4.aria2";
	const fileNameMaxLen = 128 + aria2Ext.length;
	const maxConnectionPerServer = 16;
	const split = 8;
	const maxConcurrentDownloads = 5;

	let output = "";
	mediaUrls.forEach(mediaUrl => {
		fileName = mediaUrl.title.replace(/[!/\0]/g, '').substring(0, fileNameMaxLen);
		output += `${mediaUrl.url}\n`;
		output += `\tout=${fileName}.mp4\n`;
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

		mediaUrls.forEach((value, index, array) => {
			CreateTableRow(index, value);
		});
		exportBtn.onclick = () => { ExportBtnOnClick(mediaUrls); };
		clearBtn.onclick = () => { ClearBtnOnClick(); };
	}, (error) => {});
};


RefreshMediaTable();
