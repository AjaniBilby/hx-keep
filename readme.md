## Getting Started

Import the library in your client side.

```html
<script src="https://unpkg.com/hx-keep@1.0.6"></script>
```

Enable the library at the level of your DOM you desire. i.e.:
```html
<body hx-ext="hx-keep">
```

---

## HTML Attributes

All html attributes can have the `data-` prefix if required by your framework.

### `hx-keep`

| Mode | Description |
| :- | :- |
| `innerHTML` | todo
| `outerHTML` | todo
| `form`  | todo
| `value` | todo

### `hx-keep-key`

todo

### `hx-keep-evict`

todo

### `hx-keep-hash`

todo

### `hx-keep-restore`

todo

---

## Http Headers

### Request: `HX-Keep-Key`

If a htmx request is triggered from an element with a `hx-keep-key`, that value will be included in the request sent to the server.
This is helpful in combination with the [hx-keep-evict header](#response-hx-keep-evict) to clear a value from `hx-keep` after it has been submitted to the server.

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