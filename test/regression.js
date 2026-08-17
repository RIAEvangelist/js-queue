import Queue from '../queue.js';
import {deepEqual,equal,test,throws} from './harness.js';

test('regression: invalid add input rejects the entire batch atomically',()=>{
    const queue=new Queue;
    queue.autoRun=false;
    throws(()=>queue.add(function(){},42),TypeError,'index 1');
    equal(queue.size,0);
    deepEqual(queue.contents,[]);
});

test('regression: non-array contents replacement preserves pending work',()=>{
    const queue=new Queue;
    const original=[function(){}];
    queue.contents=original;
    throws(()=>{ queue.contents={}; },TypeError,'array of functions');
    equal(queue.contents,original);
    equal(queue.size,1);
});

test('regression: invalid contents members preserve the previous array',()=>{
    const queue=new Queue;
    const original=[function(){}];
    queue.contents=original;
    throws(()=>{ queue.contents=[function(){},null]; },TypeError,'index 1');
    equal(queue.contents,original);
    equal(queue.size,1);
});

test('regression: a synchronous task failure is rethrown unchanged',()=>{
    const queue=new Queue;
    const expected=new Error('task failed');
    queue.autoRun=false;
    queue.add(function(){ throw expected; });
    equal(throws(()=>queue.next()),expected);
});

test('regression: a synchronous task failure returns the queue to idle',()=>{
    const queue=new Queue;
    queue.autoRun=false;
    queue.add(function(){ throw new Error('task failed'); },function(){});
    throws(()=>queue.next());
    equal(queue.running,false);
    equal(queue.size,1);
});

test('regression: remaining work can resume after a task failure',()=>{
    const queue=new Queue;
    const order=[];
    queue.autoRun=false;
    queue.add(
        function(){ throw new Error('task failed'); },
        function(){ order.push('recovered'); this.next(); }
    );
    throws(()=>queue.next());
    queue.next();
    deepEqual(order,['recovered']);
    equal(queue.running,false);
});

test('regression: next on an empty queue is an idle no-op',()=>{
    const queue=new Queue;
    equal(queue.next(),undefined);
    equal(queue.running,false);
    equal(queue.size,0);
});

test('regression: clear preserves caller-controlled queue flags',()=>{
    const queue=new Queue;
    queue.autoRun=false;
    queue.stop=true;
    queue.add(function(){});
    const cleared=queue.clear();
    equal(cleared,queue.contents);
    deepEqual(cleared,[]);
    equal(queue.autoRun,false);
    equal(queue.stop,true);
});
