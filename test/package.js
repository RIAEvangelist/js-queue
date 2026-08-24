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
    equal(required,require('../queue.js'));
    deepEqual(exerciseQueue(required),{order:['a','b'],running:false,size:0});
});

test('integration: package ESM queue deep path remains executable',async()=>{
    const imported=await import('js-queue/queue.js');
    deepEqual(exerciseQueue(imported.default),{order:['a','b'],running:false,size:0});
});

test('integration: package CommonJS queue deep path remains executable',()=>{
    const required=require('js-queue/queue.js');
    equal(required,require('js-queue'));
    deepEqual(exerciseQueue(required),{order:['a','b'],running:false,size:0});
});

test('integration: package ESM stack entry preserves LIFO order',async()=>{
    const imported=await import('js-queue/stack');
    deepEqual(exerciseStackOrder(imported.default),[3,2,1]);
});

test('integration: package CommonJS stack entry preserves LIFO order',()=>{
    const required=require('js-queue/stack.js');
    equal(required,require('../stack.js'));
    deepEqual(exerciseStackOrder(required),[3,2,1]);
});

test('integration: package ESM stack exposes the easy-stack 2.1 state contract',async()=>{
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

test('integration: package CommonJS stack exposes the easy-stack 2.1 state contract',()=>{
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
    equal(packageData.version,'3.1.1');
    equal(packageData.engines.node,'>=22.13.0');
    equal(packageData.dependencies['easy-stack'],'2.1.0');
    equal(packageLock.packages[''].dependencies['easy-stack'],'2.1.0');
    equal(packageLock.packages['node_modules/easy-stack'].version,'2.1.0');
    equal(packageData.devDependencies['vanilla-test'],'2.1.1');
});

test('integration: package metadata exposes the supported public surface',()=>{
    equal(packageData.author,'Brandon Nozaki Miller');
    equal(packageData.type,'module');
    equal(packageData.browser,'./queue.js');
    deepEqual(packageData.sideEffects,['./queue-vanilla.js']);
    equal(packageData.exports['.'].import,'./queue.js');
    equal(packageData.exports['.'].require,'./queue.js');
    equal(packageData.exports['./stack'].import,'./stack.js');
    equal(packageData.exports['./stack'].require,'./stack.js');
    equal(packageData.homepage,'https://riaevangelist.github.io/js-queue/');
});

test('integration: benchmark evidence matches the tagged baseline and chart claims',()=>{
    const results=JSON.parse(fs.readFileSync(new URL('../benchmarks/results.json',import.meta.url),'utf8'));
    const script=fs.readFileSync(new URL('../scripts/benchmark.js',import.meta.url),'utf8');
    const constructionChart=fs.readFileSync(new URL('../assets/benchmark-construct.svg',import.meta.url),'utf8');
    const taskChart=fs.readFileSync(new URL('../assets/benchmark-tasks.svg',import.meta.url),'utf8');

    equal(packageData.scripts.benchmark,'node --expose-gc ./scripts/benchmark.js');
    equal(script.includes("const baselineVersion='3.0.0'"),true);
    equal(script.includes('constructionSink=queues'),true);
    equal(script.includes('measured.checksum !== iterations'),true);
    equal(results.baseline,'3.0.0 WeakMap state');
    equal(results.candidate,'3.1.0 private fields');
    equal(results.metrics.length,2);
    for(const metric of results.metrics){
        equal(metric.candidate < metric.baseline,true,`${metric.label} did not improve.`);
        equal(metric.speedup > 1,true,`${metric.label} is not faster.`);
    }
    equal(constructionChart.includes(`${results.metrics[0].speedup}× faster`),true);
    equal(taskChart.includes(`${results.metrics[1].speedup}× faster`),true);
});

run().then(result=>{
    if(!result.ok){
        process.exitCode=1;
    }
});
