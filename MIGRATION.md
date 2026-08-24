# Migrating to js-queue 3.1

Version 3.1 keeps the queue API and loading syntax while changing the runtime baseline and internal state implementation.

## Move Node to 22.13 or newer

Both `import` and `require` now load the same synchronous ES module. CommonJS syntax remains unchanged:

```js
const Queue=require('js-queue');
const Stack=require('js-queue/stack');
```

Upgrade Node before installing js-queue 3.1. The package no longer ships duplicate `.cjs` runtime files or supports Node releases older than 22.13.

The queue now stores private state directly on each instance instead of performing WeakMap lookups. The public `contents`, `size`, `running`, `autoRun`, and `stop` contracts are unchanged. Browser builds now require native private class fields.

## Earlier migration: js-queue 2 to 3.0

Version 3 keeps the explicit FIFO contract while modernizing modules, package boundaries, validation, testing, and documentation.

## Choose an entry point

`js-queue` works with bundlers and without a bundler. Bundlers resolve the bare imports below normally. Native browser ESM needs the complete import map shown in the [browser guide](./browser/index.html), placed before the module script; it does not need a build, transpiler, or bundler.

New ESM code should import the primary package:

```js
import Queue from 'js-queue';
```

Existing CommonJS code can remain unchanged:

```js
const Queue=require('js-queue');
```

The compatibility deep path also resolves by module format:

```js
import Queue from 'js-queue/queue.js';
const Queue=require('js-queue/queue.js');
```

For a classic browser script, continue loading the dedicated global build:

```html
<script src="./node_modules/js-queue/queue-vanilla.js"></script>
<script>
    const queue=new Queue;
</script>
```

Do not load the ESM `queue.js` file as a classic script. Use `<script type="module">` for ESM or `queue-vanilla.js` for the global constructor.

Import-map paths are relative to the HTML document. Serve the application over HTTP(S), ensure the server exposes the mapped package files, and do not use `file://`. If npm nests a conflicting `easy-stack`, use the browser guide's scoped map so imports originating inside `js-queue` resolve its declared nested version.

## Check task values

Version 2 accepted any value into the pending array and failed later when that item reached the front. Version 3 validates every value before appending anything from the same `add()` call.

```js
queue.add(validTask,42); // throws TypeError; neither item is appended
```

Assigning `contents` now requires an array containing only functions. Direct mutation of the returned array remains possible; applications should still treat it as a function queue.

## Account for class semantics

`Queue` is now a class. Construct it with `new`. Methods live on `Queue.prototype` and are no longer enumerable own properties.

Use native subclassing:

```js
import Queue from 'js-queue';

class RequestQueue extends Queue{
    get paused(){
        return this.stop;
    }
}
```

Replace v2 patterns that assigned `MyQueue.prototype=new Queue` with `class ... extends Queue`.

## Handle errors deliberately

A synchronous task error is rethrown, but the queue now resets `running` to `false` and keeps later tasks pending. Catch the error at the call that starts or advances the queue, then decide whether to clear, retry, or call `next()`.

Promise rejections remain the task's responsibility. Use `try/finally` or `.finally()` when the next item must always be released.

## Runtime baseline

Version 3.0 required Node.js 12.22 or newer. Its development suite used `vanilla-test` on Node.js 22.12 or newer. The shipped queue itself had no Node-only imports and ran as native JavaScript in modern browsers.

## Upgrade checklist

- Select ESM, CommonJS, or classic-browser loading explicitly.
- Ensure every queued value is a function.
- Replace prototype-instance inheritance with `extends Queue`.
- Do not depend on queue methods being enumerable own properties.
- Catch synchronous task errors where execution begins or advances.
- Keep calling `this.next()` for every task that should release the queue.
- Run `npm test` and the application's own integration tests.
