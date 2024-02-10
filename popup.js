const tableBody = document.getElementById("tbody-id");
const exportBtn = document.getElementById("btn-export");
const clearBtn = document.getElementById("btn-clear");

let mediaUrls;

runtime.sendMessage(GET_MEDIA_TITLES).then(serializedMediaUrls => 
{
	mediaUrls = JSON.parse(serializedMediaUrls);
	console.log(mediaUrls);
	let mediaTitles = mediaUrls.map(mediaUrl => mediaUrl.title );

	mediaTitles.forEach((value, index, array) => {
		let newRow = tableBody.insertRow(-1);
		let indexCell = newRow.insertCell(0);
		let indexText = document.createTextNode(`${index}`);
		indexCell.appendChild(indexText);
		let titleCell = newRow.insertCell(1);
		let titleText = document.createTextNode(value);
		titleCell.appendChild(titleText);
	});
}, (error) => {});

const GenerateAria2Input = () => {
	let output = "";
	mediaUrls.forEach(mediaUrl => {
		fileName = mediaUrl.title.replace(/[/\0]/g, '').substring(0, 200);
		output += `${mediaUrl.url}\n`;
		output += `\tout=${fileName}.mp4\n`;
		output += `\tmax-connection-per-server=5\n`;
	});
	return output;
};

exportBtn.addEventListener("click", event => {
	const blob = new Blob([`${GenerateAria2Input()}`], { type: "text/plain;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	window.open(url);
	console.log("button click");
});

clearBtn.addEventListener("click", event => {
	runtime.sendMessage(CLEAR_ALL_URLS).then(() => {}, error => {});
});
