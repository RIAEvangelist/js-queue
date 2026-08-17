import Queue, {Queue as NamedQueue} from '../queue.js';
import {deepEqual,equal,test} from './harness.js';

test('unit: default and named exports identify one Queue class',()=>{
    equal(Queue,NamedQueue);
});

test('unit: constructor enables automatic execution by default',()=>{
    const queue=new Queue;
    equal(queue.autoRun,true);
});

test('unit: constructor leaves the stop gate open by default',()=>{
    const queue=new Queue;
    equal(queue.stop,false);
});

test('unit: constructor exposes an idle empty state',()=>{
    const queue=new Queue;
    equal(queue.running,false);
    equal(queue.size,0);
});

test('unit: constructor exposes an empty contents array',()=>{
    const queue=new Queue;
    deepEqual(queue.contents,[]);
});

test('unit: queue instances keep independent pending storage',()=>{
    const first=new Queue;
    const second=new Queue;
    first.autoRun=false;
    first.add(function(){});
    equal(first.size,1);
    equal(second.size,0);
    deepEqual(second.contents,[]);
});

test('unit: add returns the receiving queue',()=>{
    const queue=new Queue;
    queue.autoRun=false;
    equal(queue.add(function(){}),queue);
});

test('unit: add stores function references in input order',()=>{
    const queue=new Queue;
    const first=function(){};
    const second=function(){};
    queue.autoRun=false;
    queue.add(first,second);
    equal(queue.contents[0],first);
    equal(queue.contents[1],second);
});

test('unit: size reflects the number of pending tasks',()=>{
    const queue=new Queue;
    queue.autoRun=false;
    queue.add(function(){},function(){},function(){});
    equal(queue.size,3);
});

test('unit: contents replacement adopts the provided array',()=>{
    const queue=new Queue;
    const replacement=[function(){},function(){}];
    queue.contents=replacement;
    equal(queue.contents,replacement);
    equal(queue.size,2);
});
