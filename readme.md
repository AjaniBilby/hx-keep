Keep your htmx client state persistent across refreshes, new windows, and re-opening of your pages - as simple as:

```html
<div id="logs" hx-keep="first 3">...</div>
<form id="my-form" hx-keep="form">...</form>
```

![banner](/images/banner.gif)

## Getting Started

Import the library in your client side.

```html
<script src="https://unpkg.com/hx-keep@1.0.0"></script>
```

Enable the library at the level of your DOM you desire. i.e.:
```html
<body hx-ext="hx-keep">
```

---

## HTML Attributes

All html attributes can have the `data-` prefix if required by your framework.

### `hx-keep="{mode}"`

This attribute specifies which data to store and restore from based on the mode set

| Mode | Description |
| :- | :- |
| `innerHTML` | Will keep the entire outer html of the element
| `outerHTML` | Will keep only the inner html of the element
| `first x` | Will keep only the first `x` elements inside the main element. To prevent cutting in weird places we recommend wrapping items in a `<div style="display:contents;">` so you can control where it cuts.
| `last x` | Same as `first` but takes the last elements
| `form`  | Tracks and restores only the form values, rather than the entire html
| `value` | Identical to `form` but for use directly on an `<input>`

### `hx-keep-key`

Used to tell `hx-keep` how to identify the element, especially useful if it is shared across multiple urls or locations.

If the key is not specified, `hx-keep` will assume the key is `${url.pathname}#${element.id}`.
If both the key and id are not specified on the element, then the whole element will be ignored.

### `hx-keep-hash`

The hash is just a simple string value, and if the hash on the element, and the hash of the stored data do not match, then the element will not be restored. This can be helpful if you want to ensure content from an old format is not being restored into a new layout when you update your site.

You could also use this as a date-stamp, so if the underlying data in a form changes it throws away the client cached form.

### `hx-keep-restore="off"`

If set to `off`, then `hx-keep` will not restore, however it will still save when changes are made.
This can be helpful if on a specific load you want it to not restore from cache, and instead override with the server's contents.

### `hx-keep-evict`

Identical behaviour to the [`HX-Keep-Evict`](#response-hx-keep-evict) header, however you can also include the value directly in any element for it to take affect when mounted by htmx.

---

## Http Headers

### Request: `HX-Keep-Key`

If a htmx request is triggered from an element with a `hx-keep-key`, that value will be included in the request sent to the server.
This is helpful in combination with the [hx-keep-evict header](#response-hx-keep-evict) to clear a value from `hx-keep` after it has been submitted to the server.

### Request: `HX-Keep-Hash`

Similar to [`HX-Keep-Key`](#request-hx-keep-key), but instead will include the `hx-keep-hash` value as a http header.

### Response: `HX-Keep-Evict`

When a response with this header is received by the client, it will evict all `hx-keep` data where the key matches the pattern(s) supplied. This occurs before rendering meaning these values will be gone before any potential restoration by `hx-keep`.

> The patterns are comma separated and then have their whitespace trimmed before matching.

There is only one type of wildcard supported which is the `*` which matches with zero to many characters (i.e. `/logs/*/short/*`).

---

## JS API

### Context

```ts
window.hx_keep.context = (element: Element | null) => string | null;
```

When supplied a `Element` it will determine which `hx-keep-key` it is under if any.
This is useful in combination with `get()` and `set()` to allow client side code to store into a `hx-keep` form.

### Get

```ts
window.hx_keep.get = (key: string) => string | Record<string, string> | undefined;
```

Returns the data currently stored in `hx-keep` under this key.

### Set

```ts
window.hx_keep.set = (key: string, data: Record<string, string> | string) => void;
```

Allows you to add data into `hx-keep`.
When providing an object it will merge it with the existing data, meaning you don't have to run get first if you are attempting to just change a single attribute in a form.

```ts
hx_keep.get("example"); // { "foo": "bar" }

hx_keep.set("example", { baz: "boo" });

hx_keep.get("example"); // { "foo": "bar", "baz": "boo" }
```

### GetValue

```ts
window.hx_keep.getValue = (key: Element, name: string) => string | null;
```

Shorthand for `hx_keep.get(hx_keep.context(element), name)`

### SetValue

```ts
window.hx_keep.setValue = (key: Element, name: string, value: string, expiry?: number) => void;
```

Shorthand for `hx_keep.set(hx_keep.context(element), name, value, expiry)`

### Evict

```ts
window.hx_keep.set = (pattern: string[] | string) => void;
```

Will delete the `hx-keep` entries which have the keys that match the pattern(s) given.

The patterns can use `*` to signify zero-many characters (i.e. `/logs/*/short/*`).

### Prune

```ts
window.hx_keep.prune = () => void;
```

This will delete all of the expires entries.

### Shrink

```ts
window.hx_keep.shrink = () => void;
```

Will `prune()`, if no entries are removed it will delete the oldest one.
This is useful if you have ran out of [`localStorage` capacity](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria#web_storage)

### Clear

```ts
window.hx_keep.clear = () => void;
```

Deletes all `hx-keep` data, this is useful for ensuring all data is removed on logout.
Though you could also use a [http `hx-keep-evict: *` header](#response-hx-keep-evict) for this purpose

---

## Examples

See [https://hx-keep.ajanibilby.com/example](https://hx-keep.ajanibilby.com/example)