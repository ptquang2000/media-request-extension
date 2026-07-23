const webRequest = browser.webRequest;
const browserAction = browser.browserAction;
const storage = browser.storage.local;
const mediaUrls = [];

function loadFromStorage() {
	return storage.get("mediaUrls").then(result => {
		if (result.mediaUrls && Array.isArray(result.mediaUrls)) {
			mediaUrls.length = 0;
			mediaUrls.push(...result.mediaUrls);
		}
		browserAction.setBadgeText({text: `${mediaUrls.length}`});
	});
}

function saveToStorage() {
	return storage.set({ mediaUrls: [...mediaUrls] });
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

const ProcessMediaUrl = (title, url, contentLength) => {
	console.log(`Title: ${title} - URL: ${url}`);
	const size = contentLength.length == 1 ? formatBytes(contentLength[0].value) : 0;

	const existingIndex = mediaUrls.findIndex(item => item.url === url && item.size === size);
	if (existingIndex !== -1) {
		mediaUrls.splice(existingIndex, 1);
	}

	mediaUrls.push({title, url, size});
	browserAction.setBadgeText({text: `${mediaUrls.length}`});
	saveToStorage();
};

const OnResponseStarted = (details) => {
	if (details.type !== "media") return;

	const contentLength = details.responseHeaders.filter(header => header.name === "Content-Length");

	tabs.executeScript(
		details.tabId,
		{code: `document.title`}
	).then(results => {
		ProcessMediaUrl(results[0], details.url, contentLength);
	});
};

webRequest.onResponseStarted.addListener(
	OnResponseStarted, 
	{urls: ["<all_urls>"]},
	["responseHeaders"],
);

const HandleMessage = (request, sender, sendResponse) => {
	console.log(`handle msg ${request.type}`);
	if (request.type === GET_MEDIA_TITLES)
	{
		sendResponse(JSON.stringify(mediaUrls));
	}
	else if (request.type === CLEAR_ALL_URLS)
	{
		mediaUrls.length = 0;
		browserAction.setBadgeText({text: `${mediaUrls.length}`});
		saveToStorage();
	}
	else if (request.type === DELETE_URL_AT_INDEX)
	{
		mediaUrls.splice(request.index, 1);
		browserAction.setBadgeText({text: `${mediaUrls.length}`});
		saveToStorage();
	}
};

runtime.onMessage.addListener(HandleMessage);

loadFromStorage();
