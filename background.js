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
	console.log(`handle msg ${request}`);
	if (request === GET_MEDIA_TITLES)
	{
		sendResponse(JSON.stringify(mediaUrls));
	}
	else if (request === CLEAR_ALL_URLS)
	{
		mediaUrls.length = 0;
		browserAction.setBadgeText({text: `${mediaUrls.length}`});
	}
};

runtime.onMessage.addListener(HandleMessage);
