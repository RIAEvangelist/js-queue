import Queue from 'js-queue';
import Stack from 'js-queue/stack';
import {deepEqual,equal,test,throws} from './harness.js';

test('behavioral: serial jobs do not overlap before each owner releases the queue',()=>{
    const queue=new Queue;
    const events=[];
    const releases=[];

    function job(label){
        return function(){
            events.push(`${label} started`);
            releases.push(()=>{
                events.push(`${label} finished`);
                this.next();
            });
        };
    }

    queue.add(job('first'),job('second'),job('third'));
    deepEqual(events,['first started']);
    equal(queue.running,true);
    equal(queue.size,2);

    releases.shift()();
    deepEqual(events,['first started','first finished','second started']);
    equal(queue.running,true);
    equal(queue.size,1);

    releases.shift()();
    deepEqual(events,['first started','first finished','second started','second finished','third started']);
    equal(queue.running,true);
    equal(queue.size,0);

    releases.shift()();
    deepEqual(events,['first started','first finished','second started','second finished','third started','third finished']);
    equal(queue.running,false);
});

test('behavioral: reopening a dependency lets the next producer start buffered work in arrival order',()=>{
    const queue=new Queue;
    const sent=[];
    const send=label=>function(){ sent.push(label); this.next(); };
    queue.stop=true;

    queue.add(send('greeting'));
    queue.add(send('presence'));
    deepEqual(sent,[]);
    equal(queue.size,2);

    queue.stop=false;
    deepEqual(sent,[]);
    equal(queue.size,2);

    queue.add(send('history'));
    deepEqual(sent,['greeting','presence','history']);
    equal(queue.running,false);
    equal(queue.size,0);
});

test('behavioral: a rejected producer batch leaves existing backlog runnable',()=>{
    const queue=new Queue;
    const events=[];
    const original=function(){ events.push('original'); this.next(); };
    queue.autoRun=false;
    queue.add(original);

    throws(()=>queue.add(function(){ events.push('rejected first'); },null,function(){ events.push('rejected last'); }),TypeError,'index 1');
    deepEqual(events,[]);
    equal(queue.contents[0],original);
    equal(queue.size,1);

    queue.next();
    deepEqual(events,['original']);
    equal(queue.running,false);
    equal(queue.size,0);
});

test('behavioral: clearing backlog detaches stale contents references',()=>{
    const queue=new Queue;
    const events=[];
    queue.autoRun=false;
    queue.add(function(){ events.push('stale'); this.next(); });
    const staleContents=queue.contents;

    const cleared=queue.clear();
    equal(cleared,queue.contents);
    equal(staleContents === queue.contents,false);
    staleContents.push(function(){ events.push('repopulated'); this.next(); });
    equal(queue.size,0);

    queue.add(function(){ events.push('replacement'); this.next(); });
    queue.next();
    deepEqual(events,['replacement']);
    equal(queue.running,false);
    equal(queue.size,0);
});

test('behavioral: a default auto-run failure leaves later work recoverable',()=>{
    const queue=new Queue;
    const events=[];
    const expected=new Error('primary unavailable');

    equal(throws(()=>queue.add(
        function(){ throw expected; },
        function(){ events.push('recovered'); this.next(); }
    )),expected);
    equal(queue.running,false);
    equal(queue.size,1);
    queue.next();

    deepEqual(events,['recovered']);
    equal(queue.running,false);
    equal(queue.size,0);
});

test('behavioral: returned values and fulfilled promises wait for explicit hand-off',async()=>{
    const queue=new Queue;
    const events=[];

    queue.add(
        function(){ events.push('value returned'); return 'ignored'; },
        async function(){ await Promise.resolve(); events.push('promise fulfilled'); },
        function(){ events.push('released explicitly'); this.next(); }
    );

    deepEqual(events,['value returned']);
    equal(queue.running,true);
    equal(queue.size,2);

    equal(queue.next(),undefined);
    deepEqual(events,['value returned']);
    await Promise.resolve();
    await Promise.resolve();
    deepEqual(events,['value returned','promise fulfilled']);
    equal(queue.running,true);
    equal(queue.size,1);

    equal(queue.next(),undefined);
    deepEqual(events,['value returned','promise fulfilled','released explicitly']);
    equal(queue.running,false);
    equal(queue.size,0);
});

test('behavioral: an occupied queue does not block work on another queue',()=>{
    const occupied=new Queue;
    const available=new Queue;
    const events=[];

    occupied.add(function(){ events.push('occupied started'); });
    equal(occupied.running,true);
    equal(occupied.size,0);

    available.add(function(){ events.push('available finished'); this.next(); });
    deepEqual(events,['occupied started','available finished']);
    equal(available.running,false);
    equal(available.size,0);
    equal(occupied.running,true);

    occupied.next();
    equal(occupied.running,false);
});

test('behavioral: pending work can be reprioritized before dispatch',()=>{
    const queue=new Queue;
    const events=[];
    const step=label=>function(){ events.push(label); this.next(); };
    queue.autoRun=false;
    queue.add(step('routine'),step('urgent'));

    queue.contents.unshift(queue.contents.pop());
    queue.next();

    deepEqual(events,['urgent','routine']);
    equal(queue.running,false);
    equal(queue.size,0);
});

test('behavioral: given the native no-bundler entry when declared work runs then observable orders complete',()=>{
    const queue=new Queue;
    const stack=new Stack;
    const fifo=[];
    const lifo=[];

    queue.autoRun=false;
    stack.autoRun=false;
    queue.add(
        function(){ fifo.push('first'); this.next(); },
        function(){ fifo.push('second'); this.next(); }
    );
    stack.add(
        function(){ lifo.push('first'); this.next(); },
        function(){ lifo.push('second'); this.next(); }
    );

    queue.next();
    stack.next();

    deepEqual(fifo,['first','second']);
    deepEqual(lifo,['second','first']);
    equal(queue.running,false);
    equal(queue.size,0);
    equal(stack.running,false);
    equal(stack.size,0);
});
