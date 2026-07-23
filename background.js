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

const VIDEO_EXTENSIONS = /\.(mp4|mkv|webm|avi|mov|m4v|flv|wmv|mp3|ogg|opus|aac|flac)(?=[?#]|$)/i;

function stripVideoExtension(name) {
    return name.replace(VIDEO_EXTENSIONS, '');
}

function extractFilenameFromContentDisposition(headerValue) {
    if (!headerValue) return null;
    const match = headerValue.match(/filename="?([^";\s]+)"?/i);
    return match ? decodeURIComponent(match[1]) : null;
}

function extractTitleFromUrl(url) {
    try {
        const pathname = new URL(url).pathname;
        const segments = pathname.split('/').filter(Boolean);
        const lastSegment = segments[segments.length - 1];
        if (!lastSegment) return null;
        let name = decodeURIComponent(lastSegment);
        name = stripVideoExtension(name);
        name = name.replace(/[._-]+/g, ' ').trim();
        return name || null;
    } catch {
        return null;
    }
}

const SITE_BRANDING = /\s+[-|::]\s+\S+$/;

function cleanTitle(text) {
    return text.replace(SITE_BRANDING, '').trim();
}

function resolveMediaTitle(url, headers, pageTitle) {
    const cdHeader = headers.find(h => h.name.toLowerCase() === 'content-disposition');
    if (cdHeader) {
        const filename = extractFilenameFromContentDisposition(cdHeader.value);
        if (filename) {
            const cdTitle = cleanTitle(stripVideoExtension(filename).replace(/[._-]+/g, ' ').trim());
            if (cdTitle.length > 0) return cdTitle;
        }
    }

    if (pageTitle) {
        const cleaned = cleanTitle(pageTitle);
        if (cleaned.length > 0) return cleaned;
    }

    const urlTitle = extractTitleFromUrl(url);
    if (urlTitle) {
        const cleaned = cleanTitle(urlTitle);
        if (cleaned.length > 0) return cleaned;
    }

    return pageTitle || url;
}

function fetchContentLengthViaHead(url) {
	return fetch(url, { method: 'HEAD' }).then(response => {
		const length = response.headers.get('Content-Length');
		return length ? parseInt(length, 10) : null;
	}).catch(() => null);
}

const ProcessMediaUrl = (title, url, size) => {
	console.log(`Title: ${title} - URL: ${url}`);

	const existingIndex = mediaUrls.findIndex(item => item.url === url && item.size === size);
	if (existingIndex !== -1) {
		mediaUrls.splice(existingIndex, 1);
	}

	mediaUrls.push({title, url, size});
	browserAction.setBadgeText({text: `${mediaUrls.length}`});
	saveToStorage();
};

const TITLE_SCRIPT = `
	(function() {
		var meta = document.querySelector('meta[property="og:title"]');
		if (meta && meta.content) return meta.content;
		meta = document.querySelector('meta[name="og:title"]');
		if (meta && meta.content) return meta.content;
		var h1 = document.querySelector('h1');
		if (h1 && h1.textContent.trim()) return h1.textContent.trim();
		return document.title;
	})()
`;

const TITLE_RETRY_DELAYS = [0, 500, 1500];

function extractTitleWithRetry(tabId, attempt) {
	return new Promise((resolve) => {
		const delay = TITLE_RETRY_DELAYS[attempt] || 0;
		window.setTimeout(() => {
			tabs.executeScript(tabId, {code: TITLE_SCRIPT}).then(results => {
				const pageTitle = results && results[0] ? results[0] : null;
				resolve(pageTitle);
			}).catch(() => {
				resolve(null);
			});
		}, delay);
	}).then(pageTitle => {
		if (pageTitle && pageTitle.length > 3) {
			return pageTitle;
		}
		if (attempt < TITLE_RETRY_DELAYS.length - 1) {
			return extractTitleWithRetry(tabId, attempt + 1);
		}
		return pageTitle;
	});
}

const OnResponseStarted = (details) => {
	if (details.type !== "media") return;

	const contentLength = details.responseHeaders.filter(h => h.name === "Content-Length");

	const resolveSize = contentLength.length == 1
		? Promise.resolve(formatBytes(contentLength[0].value))
		: fetchContentLengthViaHead(details.url).then(bytes => bytes ? formatBytes(bytes) : 'Unknown');

	const resolveTitle = extractTitleWithRetry(details.tabId, 0)
		.then(pageTitle => resolveMediaTitle(details.url, details.responseHeaders, pageTitle))
		.catch(() => resolveMediaTitle(details.url, details.responseHeaders, null));

	Promise.all([resolveTitle, resolveSize]).then(([title, size]) => {
		ProcessMediaUrl(title, details.url, size);
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
		const index = mediaUrls.findIndex(item => item.url === request.url && item.size === request.size);
		if (index !== -1) {
			mediaUrls.splice(index, 1);
			browserAction.setBadgeText({text: `${mediaUrls.length}`});
			saveToStorage();
		}
	}
};

runtime.onMessage.addListener(HandleMessage);

loadFromStorage();
