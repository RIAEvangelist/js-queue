import Queue, {Queue as NamedQueue} from '../queue.js';
import {deepEqual,equal,run,test,throws} from './harness.js';

test('exports the same Queue class by default and by name',()=>{
    equal(Queue,NamedQueue);

    const queue=new Queue;
    equal(queue.autoRun,true);
    equal(queue.stop,false);
    equal(queue.running,false);
    equal(queue.size,0);
    deepEqual(queue.contents,[]);
});

test('runs added tasks in first-in-first-out order',()=>{
    const queue=new Queue;
    const order=[];

    queue.add(
        function(){ order.push('first'); this.next(); },
        function(){ order.push('second'); this.next(); },
        function(){ order.push('third'); this.next(); }
    );

    deepEqual(order,['first','second','third']);
    equal(queue.running,false);
    equal(queue.size,0);
});

test('supports manual flow when autoRun is disabled',()=>{
    const queue=new Queue;
    const order=[];
    queue.autoRun=false;

    const returned=queue.add(
        function(){ order.push(1); this.next(); },
        function(){ order.push(2); this.next(); }
    );

    equal(returned,queue);
    equal(queue.running,false);
    equal(queue.size,2);
    queue.next();
    deepEqual(order,[1,2]);
    equal(queue.running,false);
});

test('holds work behind stop and resumes explicitly',()=>{
    const queue=new Queue;
    const order=[];
    queue.stop=true;

    queue.add(
        function(){ order.push('held first'); this.next(); },
        function(){ order.push('held second'); this.next(); }
    );

    deepEqual(order,[]);
    equal(queue.size,2);
    queue.next();
    equal(queue.running,false);

    queue.stop=false;
    queue.next();
    deepEqual(order,['held first','held second']);
});

test('can pause from inside a task without losing pending work',()=>{
    const queue=new Queue;
    const order=[];

    queue.add(
        function(){
            order.push('pause');
            this.stop=true;
            this.next();
        },
        function(){ order.push('resume'); this.next(); }
    );

    deepEqual(order,['pause']);
    equal(queue.running,false);
    equal(queue.size,1);
    queue.stop=false;
    queue.next();
    deepEqual(order,['pause','resume']);
});

test('binds each task to the queue and defers additions while active',()=>{
    const queue=new Queue;
    const order=[];

    queue.add(function(){
        equal(this,queue);
        order.push('active');
        this.add(function(){ order.push('added'); this.next(); });
        equal(this.size,1);
        this.next();
    });

    deepEqual(order,['active','added']);
    equal(queue.running,false);
});

test('clears pending work without interrupting the active task',()=>{
    const queue=new Queue;
    const order=[];
    let cleared;

    queue.add(
        function(){
            order.push('active');
            cleared=this.clear();
            this.next();
        },
        function(){ order.push('removed'); this.next(); }
    );

    deepEqual(cleared,[]);
    deepEqual(order,['active']);
    equal(queue.size,0);
    equal(queue.running,false);
});

test('exposes replaceable contents while validating the replacement',()=>{
    const queue=new Queue;
    const order=[];
    queue.autoRun=false;
    const replacement=[function(){ order.push('replacement'); this.next(); }];

    queue.contents=replacement;
    equal(queue.contents,replacement);
    equal(queue.size,1);
    queue.next();
    deepEqual(order,['replacement']);

    throws(()=>{ queue.contents={}; },TypeError,'array of functions');
    throws(()=>{ queue.contents=[()=>{},null]; },TypeError,'index 1');
});

test('rejects invalid tasks atomically',()=>{
    const queue=new Queue;
    throws(()=>queue.add(()=>{},42),TypeError,'index 1');
    equal(queue.size,0);
    equal(queue.running,false);
});

test('returns to an idle recoverable state when a task throws',()=>{
    const queue=new Queue;
    const expected=new Error('task failed');
    const order=[];
    queue.autoRun=false;
    queue.add(
        function(){ throw expected; },
        function(){ order.push('recovered'); this.next(); }
    );

    equal(throws(()=>queue.next()),expected);
    equal(queue.running,false);
    equal(queue.size,1);
    queue.next();
    deepEqual(order,['recovered']);
});

test('preserves FIFO order across asynchronous hand-offs',async()=>{
    const queue=new Queue;
    const order=[];

    await new Promise(resolve=>{
        queue.add(
            function(){
                order.push('request started');
                setTimeout(()=>{
                    order.push('request finished');
                    this.next();
                },0);
            },
            function(){
                order.push('next task');
                this.next();
                resolve();
            }
        );
    });

    deepEqual(order,['request started','request finished','next task']);
    equal(queue.running,false);
});

test('treats next on an empty queue as an idle no-op',()=>{
    const queue=new Queue;
    equal(queue.next(),undefined);
    equal(queue.running,false);
    equal(queue.size,0);
});

export default run;
