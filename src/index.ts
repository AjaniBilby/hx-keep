var hx_keep = function(){

const MODES = [ "innerHTML", "outerHTML", "form", "value" ];
const DEFAULT_EXPIRY = 30 * 60; // 30 mins in seconds

(globalThis as any).htmx.defineExtension("hx-keep", {
	init: () => { Prune(LoadCache()) },
	onEvent: (name: string, event: CustomEvent) => {
		switch (name) {
			case "htmx:afterProcessNode": {
				const parent: Element = event.target || event.detail.elt;

				{ // evict
					let evict = GetAttribute(parent, "hx-keep-evict");
					if (evict) {
						if (evict === "this") evict = GetKey(parent) || "";
						evict.split(",").map(x => Evict(x.trim()));
					}
				}

				{ // try restoring
					const keep = GetAttribute(parent, "hx-keep");
					const nodes = [ ...parent.querySelectorAll("[hx-keep],[data-hx-keep]") ];
					if (keep !== null) nodes.push(parent);

					for (const e of nodes) RestoreNode(e);
				}

				const root = GetAttribute(parent, "hx-keep") ? parent : parent.closest("[hx-keep],[data-hx-keep]");
				if (root) SaveNode(root, true);

				return;
			}
			case "htmx:afterRequest": {
				const xhr = event.detail.xhr as XMLHttpRequest;
				const evict = xhr.getResponseHeader("hx-keep-evict");
				if (evict) evict.split(",").map(x => Evict(x.trim()));

				return;
			}

			case "htmx:configRequest": {
				const node: Element = event.target || event.detail.elt;
				const key = GetKey(node);

				if (key) {
					const headers = event.detail.headers as Record<string, string> ;
					headers["HX-Keep-Key"] = key;
				}

				return;
			}
		}
	}
});

function SaveNode(element: Element, simulated: boolean) {
	const key = GetKey(element);
	if (!key) return;

	const entry: CacheEntry = {
		d: "", m: 0,
		t: Math.floor(Date.now() / 1000).toString(36)
	}

	{ // calculate expiry
		const expiry = GetExpiry(element);
		if (expiry) entry.e = Math.ceil(expiry).toString(36);
	}

	const hash = GetAttribute(element, "hx-keep-hash");
	if (hash) entry.h = hash;

	const mode = GetAttribute(element, "hx-keep") || "innerHTML";
	switch (mode) {
		case "innerHTML": {
			entry.m = MODES.indexOf("innerHTML");
			entry.d = element.innerHTML;
			break;
		}
		case "outerHTML": {
			entry.m = MODES.indexOf("outerHTML");
			entry.d = element.innerHTML;
			break;
		}
		case "form": {
			if (!(element instanceof HTMLFormElement)) return console.error("hx-keep cannot restore form on", element);
			if (simulated) return;

			entry.m = MODES.indexOf("form");
			entry.d = {} as Record<string, string>;

			// retain extra data not in current form
			const existing = GetCache(key);
			if (existing && existing.m == entry.m && typeof existing.d === "object") {
				for (const key in existing.d) entry.d[key] = existing.d[key];
			}

			const formData = new FormData(element);
			for (const [name, value] of formData.entries()) entry.d[name] = value.toString();


			break;
		}
		case "value": {
			if (!(element instanceof HTMLInputElement)) return console.error("hx-keep cannot save value on", element);
			if (simulated) return;

			entry.m = MODES.indexOf("value");
			entry.d = element.value;
			break;
		}
		default: {
			entry.m = MODES.indexOf("innerHTML");

			if (mode.startsWith("first ")) {
				const limit = Number(mode.slice("first ".length)) || 0;
				entry.d = [...element.children].slice(0, limit).map(x => x.outerHTML).join("");

			} else if (mode.startsWith("last ")) {
				const limit = Number(mode.slice("last ".length)) || 0;

				entry.d = [...element.children].slice(-limit).map(x => x.outerHTML).join("");
			} else {
				console.error("Invalid hx-keep mode", element);
				return;
			}
		}
	}


	SetCache(key, entry);
}

function RestoreNode(element: Element) {
	if (GetAttribute(element, "hx-keep-restore") === "off") return;

	const key = GetKey(element);
	if (!key) return;

	const cache = GetCache(key);
	if (!cache) return;

	const hash = GetAttribute(element, "hx-keep-hash");
	if (hash || cache.h) { // if hashes present
		if ((hash != cache.h)) return;
	}

	switch (MODES[cache.m]) {
		case "innerHTML": {
			if (typeof cache.d !== "string") return;
			element.innerHTML = cache.d;
			return;
		}
		case "outerHTML": {
			if (typeof cache.d !== "string") return;
			element.outerHTML = cache.d;
			return;
		}
		case "form": {
			if (typeof cache.d !== "object") return;
			if (!(element instanceof HTMLFormElement)) return console.error("hx-keep cannot restore form on", element);

			for (const field of element.elements) {
				const key = field.getAttribute("name");
				if (!key) continue;

				const value = cache.d[key];
				if (!value) continue;

				if (field instanceof HTMLTextAreaElement) field.value = value;
				else if (field instanceof HTMLInputElement) {
					switch (field.type) {
						case "radio": if (field.value === value) field.checked = true; break;
						case "checkbox": field.checked = value === "on"; break;
						default: field.value = value;
					}
				}
			}

			return;
		}
		case "value": {
			if (!(element instanceof HTMLInputElement)) return console.error("hx-keep cannot restore value on", element);
			if (typeof cache.d !== "string") return;
			element.value = cache.d;
			return;
		}
	}
}

function GetKey(element: Element) {
	const key = GetAttribute(element, "hx-keep-key");
	if (key) return key;

	const id = element.id;
	if (!id) return null;

	return window.location.pathname + "#" + id;
}


type CacheEntry = {
	d:  string | Record<string, string>, // data
	m:  number, // mode
	t:  string, // timestamp unix radix 36
	e?: string, // expiry in seconds radix 36
	h?: string, // hash, must match to restore
};
function GetCache(key: string): CacheEntry | null {
	const data = LoadCache();
	return data[key] || null;
}


function SetCache(key: string, data: CacheEntry) {
	const index = LoadCache();
	index[key] = data;

	SaveCache(index);
}


type Cache = Record<string, CacheEntry>;
function LoadCache(): Cache {
	const cache = JSON.parse(localStorage.getItem("hx-keep") || "{}") as unknown;

	// ensure data isn't corrupt
	if (!cache) return {};
	if (typeof cache !== "object") return {};
	if (Array.isArray(cache)) return {};

	return cache as Cache;
}

function SaveCache(data: Cache) {
	for (let i=0; i<10; i++) { // retry up to 10 times
		try {
			localStorage.setItem("hx-keep", JSON.stringify(data));
		} catch (e) {
			if (!(e instanceof DOMException)) throw e;
			if (e.name !== "QuotaExceededError" && e.name !== "NS_ERROR_DOM_QUOTA_REACHED") throw e;

			Prune(data, true);
		}
	}
}


function Prune(index: Cache, force = false) {
	const now = Math.floor(Date.now() / 1000);
	let cleaned = false;

	let oldestTime = Number.MAX_SAFE_INTEGER;
	let oldest = "";

	for (const key in index) {
		const entry = index[key];

		const t = parseInt(entry.t, 36);
		if (t < oldestTime) {
			oldestTime = t;
			oldest = key;
		}

		if (!entry.e) continue;

		let expire = DEFAULT_EXPIRY;
		if (entry.e) expire = parseInt(entry.e, 36);

		// remove if expired
		if (t + expire >= now) continue;
		delete index[key];
	}

	if (force && oldest && !cleaned) {
		delete index[oldest];
		cleaned = true;
	}

	SaveCache(index);
	return cleaned;
}



function GetAttribute(element: Element, attribute: string) {
	return element.getAttribute(attribute) || element.getAttribute("data-"+attribute);
}

function GetExpiry(element: Element) {
	const expiry = GetAttribute(element, "hx-keep-expiry");
	if (!expiry) return undefined;

	if (expiry.endsWith("s")) return Number(expiry.slice(0, -1));
	if (expiry.endsWith("m")) return Number(expiry.slice(0, -1)) * 60;
	if (expiry.endsWith("h")) return Number(expiry.slice(0, -1)) * 60 * 60;
	if (expiry.endsWith("d")) return Number(expiry.slice(0, -1)) * 60 * 60 * 24;

	return Number(expiry);
}



function Evict (patterns: string | string[]) {
	if (!Array.isArray(patterns)) patterns = [patterns];

	const cache = LoadCache();
	const next = {} as Cache;

	for (const key in cache) {
		if (patterns.some(p => MatchWild(key, p))) continue;
		next[key] = cache[key];
	}

	SaveCache(next);
}

function MatchWild(str: string, pattern: string) {
	let checkpoint = str[0] === "*" ? 0 : -1;

	let j = 0;
	for (let i=0; i<str.length; i++) {
		if (str[i] !== pattern[j]) {
			if (checkpoint === -1) return false;
			j = checkpoint;
			continue;
		}

		j++;

		if (pattern[j] === "*") {
			j++;
			checkpoint = j;
		}
	}

	if (j === pattern.length) return true;
	if (j === pattern.length - 1) return pattern[j] === "*";

	return false;
}




function AutoSave(element: Element) {
	const keep = GetAttribute(element, "hx-keep");
	if (keep === "value") return SaveNode(element, false);

	const form = element.closest("form[hx-keep],form[data-hx-keep]");
	if (form) return SaveNode(form, false);
}

document.addEventListener("change", (ev) => {
	if (!ev.target) return;
	if (!(ev.target instanceof Element)) return;
	AutoSave(ev.target);
});

document.addEventListener("keyup", (ev) => {
	if (ev.target instanceof HTMLInputElement)    return AutoSave(ev.target);
	if (ev.target instanceof HTMLTextAreaElement) return AutoSave(ev.target);
});

document.addEventListener("load", () => {
	const nodes = document.body.querySelectorAll("[hx-keep],[data-hx-keep]");
	for (const node of nodes) RestoreNode(node);
});


return {
	/**
	 * Given the element, return the hx-keep-key this element is within
	 */
	context: (element: Element | null): string | null => {
		if (!element) return null;

		const key = GetAttribute(element, "hx-keep-key");
		if (key) return key;

		const parent = element.closest("[hx-keep-key],[hx-keep-key-data]");
		if (!parent) return null;

		return GetAttribute(parent, "hx-keep-key");
	},

	/**
	 * Get the data stored in this current hx-keep
	 */
	get: (key: string) => GetCache(key)?.d,

	/**
	 * Save data into the hx-keep, this will only add data/overwrite, and will not remove any omitted entries
	 */
	set: (key: string, data: Record<string, string> | string, expiry?: number): void => {
		const entry: CacheEntry = GetCache(key) || { d: "", m: 0, t: "" };
		entry.t = Math.floor(Date.now() / 1000).toString(36);

		if (expiry) entry.e = Math.floor(expiry / 1000).toString(36);

		if (typeof data === "string") {
			entry.d = data;
			entry.m = MODES.indexOf("value");
		} else if (typeof entry.d === "string") {
			entry.d = data;
			entry.m = MODES.indexOf("form");
		} else {
			for (const key in data) entry.d[key] = data[key];
			entry.m = MODES.indexOf("form");
		}

		SetCache(key, entry);
	},

	/**
	 * Remove entries that match the pattern(s)
	 */
	evict: Evict,

	/**
	 * Remove expired elements, if none present it will remove the oldest element
	 */
	shrink: () => Prune(LoadCache(), true)
}
}()