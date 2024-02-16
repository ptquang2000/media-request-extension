const webRequest = browser.webRequest;
const browserAction = browser.browserAction;
const mediaUrls = [];

const ProcessMediaUrl = (title, url) => {
	console.log(`Title: ${title} - URL: ${url}`);

	mediaUrls.push({title: title, url: url});
	browserAction.setBadgeText({text: `${mediaUrls.length}`});
};

const OnResponseStarted = (details) => {
	if (details.type !== "media") return;

	tabs.executeScript(
		details.tabId,
		{code: `document.title`}
	).then(results => {
		ProcessMediaUrl(results[0], details.url);
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
