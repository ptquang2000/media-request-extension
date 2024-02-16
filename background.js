const webRequest = browser.webRequest;
const browserAction = browser.browserAction;
const mediaUrls = [];

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
	if (contentLength.length == 1) {
		const size = contentLength[0].value;
		mediaUrls.push({title: title, url: url, size: formatBytes(size)});
	} else {
		mediaUrls.push({title: title, url: url, size: 0});
	}
	browserAction.setBadgeText({text: `${mediaUrls.length}`});
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
	}
	else if (request.type === DELETE_URL_AT_INDEX)
	{
		mediaUrls.splice(request.index, 1);
		browserAction.setBadgeText({text: `${mediaUrls.length}`});
	}
};

runtime.onMessage.addListener(HandleMessage);
