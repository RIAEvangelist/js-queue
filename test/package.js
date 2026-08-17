import {createRequire} from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
import {deepEqual,equal,run,test} from './harness.js';

const require=createRequire(import.meta.url);
const packageData=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const packageLock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));
const classicSource=fs.readFileSync(new URL('../queue-vanilla.js',import.meta.url),'utf8');

function exerciseQueue(QueueType){
    const queue=new QueueType;
    const order=[];
    queue.add(
        function(){ order.push('a'); this.next(); },
        function(){ order.push('b'); this.next(); }
    );
    return {order,running:queue.running,size:queue.size};
}

function exerciseStackOrder(Stack){
    const stack=new Stack;
    const order=[];
    stack.autoRun=false;
    stack.add(
        function(){ order.push(1); this.next(); },
        function(){ order.push(2); this.next(); },
        function(){ order.push(3); this.next(); }
    );
    stack.next();
    return order;
}

function exerciseStackState(Stack){
    const stack=new Stack;
    const first=function(){};
    const second=function(){};
    stack.autoRun=false;
    const returned=stack.add(first);
    const sizeAfterAdd=stack.size;
    const contentsAreStack=stack.stack === stack.contents();
    stack.contents([first,second]);
    const sizeAfterReplace=stack.size;
    const cleared=stack.clear();
    return {
        clearedIsStack:cleared === stack.stack,
        contentsAreStack,
        returnedIsStack:returned === stack,
        running:stack.running,
        sizeAfterAdd,
        sizeAfterClear:stack.size,
        sizeAfterReplace
    };
}

test('integration: package primary ESM entry exports and executes Queue',async()=>{
    const imported=await import('js-queue');
    equal(imported.default,imported.Queue);
    deepEqual(exerciseQueue(imported.default),{order:['a','b'],running:false,size:0});
});

test('integration: package primary CommonJS entry exports and executes Queue',()=>{
    const required=require('js-queue');
    equal(required,required.Queue);
    deepEqual(exerciseQueue(required),{order:['a','b'],running:false,size:0});
});

test('integration: package ESM queue deep path remains executable',async()=>{
    const imported=await import('js-queue/queue.js');
    deepEqual(exerciseQueue(imported.default),{order:['a','b'],running:false,size:0});
});

test('integration: package CommonJS queue deep path remains executable',()=>{
    const required=require('js-queue/queue.js');
    deepEqual(exerciseQueue(required),{order:['a','b'],running:false,size:0});
});

test('integration: package ESM stack entry preserves LIFO order',async()=>{
    const imported=await import('js-queue/stack');
    deepEqual(exerciseStackOrder(imported.default),[3,2,1]);
});

test('integration: package CommonJS stack entry preserves LIFO order',()=>{
    const required=require('js-queue/stack.js');
    deepEqual(exerciseStackOrder(required),[3,2,1]);
});

test('integration: package ESM stack exposes the easy-stack 2 state contract',async()=>{
    const imported=await import('js-queue/stack');
    deepEqual(exerciseStackState(imported.default),{
        clearedIsStack:true,
        contentsAreStack:true,
        returnedIsStack:true,
        running:false,
        sizeAfterAdd:1,
        sizeAfterClear:0,
        sizeAfterReplace:2
    });
});

test('integration: package CommonJS stack exposes the easy-stack 2 state contract',()=>{
    const required=require('js-queue/stack');
    deepEqual(exerciseStackState(required),{
        clearedIsStack:true,
        contentsAreStack:true,
        returnedIsStack:true,
        running:false,
        sizeAfterAdd:1,
        sizeAfterClear:0,
        sizeAfterReplace:2
    });
});

test('integration: package classic script publishes a global Queue constructor',()=>{
    const context={};
    vm.runInNewContext(classicSource,context,{filename:'queue-vanilla.js'});
    equal(typeof context.Queue,'function');
});

test('integration: package classic global executes the FIFO contract',()=>{
    const context={};
    vm.runInNewContext(classicSource,context,{filename:'queue-vanilla.js'});
    deepEqual(exerciseQueue(context.Queue),{order:['a','b'],running:false,size:0});
});

test('integration: package metadata pins supported runtimes and dependencies',()=>{
    equal(packageData.version,'3.0.0');
    equal(packageData.engines.node,'>=12.22.0');
    equal(packageData.dependencies['easy-stack'],'2.0.0');
    equal(packageLock.packages[''].dependencies['easy-stack'],'2.0.0');
    equal(packageLock.packages['node_modules/easy-stack'].version,'2.0.0');
    equal(packageData.devDependencies['vanilla-test'],'2.1.1');
});

test('integration: package metadata exposes the supported public surface',()=>{
    equal(packageData.author,'Brandon Nozaki Miller');
    equal(packageData.type,'module');
    deepEqual(packageData.sideEffects,['./queue-vanilla.js']);
    equal(packageData.exports['.'].import,'./queue.js');
    equal(packageData.exports['.'].require,'./queue.cjs');
    equal(packageData.exports['./stack'].import,'./stack.js');
    equal(packageData.exports['./stack'].require,'./stack.cjs');
    equal(packageData.homepage,'https://riaevangelist.github.io/js-queue/');
});

run().then(result=>{
    if(!result.ok){
        process.exitCode=1;
    }
});
