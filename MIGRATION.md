# Migrating from js-queue 2 to 3

Version 3 keeps the explicit FIFO contract while modernizing modules, package boundaries, validation, testing, and documentation.

## Choose an entry point

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

The package now requires Node.js 12.22 or newer. Development with `vanilla-test` requires Node.js 22.12 or newer. The shipped queue itself has no Node-only imports and runs as native JavaScript in modern browsers.

## Upgrade checklist

- Select ESM, CommonJS, or classic-browser loading explicitly.
- Ensure every queued value is a function.
- Replace prototype-instance inheritance with `extends Queue`.
- Do not depend on queue methods being enumerable own properties.
- Catch synchronous task errors where execution begins or advances.
- Keep calling `this.next()` for every task that should release the queue.
- Run `npm test` and the application's own integration tests.
