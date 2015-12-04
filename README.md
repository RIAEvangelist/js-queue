# js-queue

# Stable
needs more documentation

# great for

1. socket communication
2. async operations
3. synchronous operations
4. atomic operations
3. code with requirements before executing code
4. queues you want to start execution any time you add a new item
5. any simple or complex queue operations
6. base class to extend

|key|type|paramaters|description|
|----|----|----|----|
|add|function|any number of functions|adds all parameter functions to queue and starts execution if autoRun is true, queue is not already running and queue is not forcibly stopped |
|next|function||executes next item in queue if queue is not forcibly stopped|
|autoRun|bool||should autoRun queue when new item added|
|stop|bool||setting this to true will forcibly prevent the queue from executing|

# Extending

```javascript

    var Queue=require('js-queue');
    
    function MyAwesomeQueue(){
        Object.assign(this,new Queue);
        Object.defineProperties(
            this,
            {
                isStopped:{
                    enumerable:true,
                    get:checkStopped,
                    set:checkStopped
                }
            }
        );
        Object.seal(this);
        
        function checkStopped(){
            return this.stop;
        }
    }
    
```
