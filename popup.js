const tableBody = document.getElementById("tbody-id");
const exportBtn = document.getElementById("btn-export");
const clearBtn = document.getElementById("btn-clear");

const DeleteURLByIndex = (index) => {
	runtime.sendMessage({type: DELETE_URL_AT_INDEX, index: index}).then(() => {
		RefreshMediaTable();
	}, error => {});
};

const CreateTableRow = (index, value) => {
	let newRow = tableBody.insertRow(-1);

	let indexCell = newRow.insertCell(0);
	let indexText = document.createTextNode(`${index}`);
	indexCell.appendChild(indexText);

	let titleCell = newRow.insertCell(1);
	let titleText = document.createTextNode(value);
	titleCell.appendChild(titleText);

	let delCell = newRow.insertCell(2);
	let delBtn = document.createElement("button");
	delBtn.onclick = () => { DeleteURLByIndex(index); };
	delBtn.textContent = "Del";
	delCell.appendChild(delBtn);
}

const GenerateAria2Input = (mediaUrls) => {
	const fileExt = ".mp4";
	const aria2Ext = ".aria2";
	const fileNameMaxLen = 255 - fileExt.length - aria2Ext.length;
	const maxConnectionPerServer = 4;

	let output = "";
	mediaUrls.forEach(mediaUrl => {
		fileName = mediaUrl.title.replace(/[/\0]/g, '').substring(0, fileNameMaxLen);
		output += `${mediaUrl.url}\n`;
		output += `\tout=${fileName}${fileExt}\n`;
		output += `\tmax-connection-per-server=${maxConnectionPerServer}\n`;
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
		let mediaTitles = mediaUrls.map(mediaUrl => mediaUrl.title);

		tableBody.innerHTML = '';
		exportBtn.onclick = null;
		clearBtn.onclick = null;

		mediaTitles.forEach((value, index, array) => {
			CreateTableRow(index, value);
		});
		exportBtn.onclick = () => { ExportBtnOnClick(mediaUrls); };
		clearBtn.onclick = () => { ClearBtnOnClick(); };
	}, (error) => {});
};


RefreshMediaTable();
