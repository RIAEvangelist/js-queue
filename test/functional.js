import Queue from 'js-queue';
import {deepEqual,equal,test} from './harness.js';

test('functional: autoRun starts newly added work synchronously',()=>{
    const queue=new Queue;
    let calls=0;
    queue.add(function(){ calls+=1; });
    equal(calls,1);
});

test('functional: cooperative tasks execute in first-in-first-out order',()=>{
    const queue=new Queue;
    const order=[];
    queue.add(
        function(){ order.push('first'); this.next(); },
        function(){ order.push('second'); this.next(); },
        function(){ order.push('third'); this.next(); }
    );
    deepEqual(order,['first','second','third']);
});

test('functional: disabling autoRun leaves a new batch pending',()=>{
    const queue=new Queue;
    let called=false;
    queue.autoRun=false;
    queue.add(function(){ called=true; });
    equal(called,false);
    equal(queue.running,false);
    equal(queue.size,1);
});

test('functional: manual next selects the oldest pending task',()=>{
    const queue=new Queue;
    const order=[];
    queue.autoRun=false;
    queue.add(
        function(){ order.push('oldest'); },
        function(){ order.push('newest'); }
    );
    queue.next();
    deepEqual(order,['oldest']);
    equal(queue.size,1);
    equal(queue.running,true);
});

test('functional: cooperative hand-offs drain a manually started batch',()=>{
    const queue=new Queue;
    const order=[];
    queue.autoRun=false;
    queue.add(
        function(){ order.push(1); this.next(); },
        function(){ order.push(2); this.next(); }
    );
    queue.next();
    deepEqual(order,[1,2]);
    equal(queue.running,false);
    equal(queue.size,0);
});

test('functional: stop prevents automatic execution after add',()=>{
    const queue=new Queue;
    let called=false;
    queue.stop=true;
    queue.add(function(){ called=true; });
    equal(called,false);
    equal(queue.size,1);
});

test('functional: next while stopped preserves the oldest task',()=>{
    const queue=new Queue;
    const oldest=function(){};
    queue.stop=true;
    queue.add(oldest);
    queue.next();
    equal(queue.contents[0],oldest);
    equal(queue.size,1);
    equal(queue.running,false);
});

test('functional: opening the stop gate does not execute work by itself',()=>{
    const queue=new Queue;
    let called=false;
    queue.stop=true;
    queue.add(function(){ called=true; });
    queue.stop=false;
    equal(called,false);
    equal(queue.size,1);
});

test('functional: explicit next after stop release resumes FIFO execution',()=>{
    const queue=new Queue;
    const order=[];
    queue.stop=true;
    queue.add(
        function(){ order.push('held first'); this.next(); },
        function(){ order.push('held second'); this.next(); }
    );
    queue.stop=false;
    queue.next();
    deepEqual(order,['held first','held second']);
    equal(queue.running,false);
});

test('functional: each task receives its queue as this',()=>{
    const queue=new Queue;
    let context;
    queue.add(function(){ context=this; this.next(); });
    equal(context,queue);
});
