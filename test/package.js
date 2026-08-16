import {createRequire} from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
import Queue from '../queue.js';
import {deepEqual,equal,run,test} from './harness.js';

const require=createRequire(import.meta.url);
const packageData=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const packageLock=JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'));

function exerciseQueue(QueueType){
    const queue=new QueueType;
    const order=[];
    queue.add(
        function(){ order.push('a'); this.next(); },
        function(){ order.push('b'); this.next(); }
    );
    return {order,running:queue.running,size:queue.size};
}

test('package self-reference resolves ESM and CommonJS consumers',async()=>{
    const imported=await import('js-queue');
    const required=require('js-queue');
    equal(imported.default,Queue);
    equal(imported.Queue,Queue);
    equal(required,required.Queue);
    deepEqual(exerciseQueue(imported.default),exerciseQueue(required));
});

test('documented queue deep paths preserve conditional compatibility',async()=>{
    const imported=await import('js-queue/queue.js');
    const required=require('js-queue/queue.js');
    deepEqual(exerciseQueue(imported.default),exerciseQueue(required));
});

test('stack entry points preserve easy-stack LIFO behavior',async()=>{
    const imported=await import('js-queue/stack');
    const required=require('js-queue/stack.js');

    for(const Stack of [imported.default,required]){
        const stack=new Stack;
        const order=[];
        stack.autoRun=false;
        stack.add(
            function(){ order.push(1); this.next(); },
            function(){ order.push(2); this.next(); },
            function(){ order.push(3); this.next(); }
        );
        stack.next();
        deepEqual(order,[3,2,1]);
    }
});

test('stack entry exposes the modern easy-stack state contract',async()=>{
    const imported=await import('js-queue/stack');
    const required=require('js-queue/stack');

    for(const Stack of [imported.default,required]){
        const stack=new Stack;
        const first=function(){};
        const second=function(){};
        stack.autoRun=false;

        equal(stack.add(first),stack);
        equal(stack.size,1);
        equal(stack.stack,stack.contents());

        stack.contents([first,second]);
        equal(stack.size,2);
        equal(stack.clear(),stack.stack);
        equal(stack.size,0);
        equal(stack.running,false);
    }
});

test('classic browser script publishes a working global Queue',()=>{
    const source=fs.readFileSync(new URL('../queue-vanilla.js',import.meta.url),'utf8');
    const context={};
    vm.runInNewContext(source,context,{filename:'queue-vanilla.js'});
    equal(typeof context.Queue,'function');
    deepEqual(exerciseQueue(context.Queue),{order:['a','b'],running:false,size:0});
});

test('package metadata exposes only supported public files',()=>{
    equal(packageData.version,'3.0.0');
    equal(packageData.author,'Brandon Nozaki Miller');
    equal(packageData.type,'module');
    deepEqual(packageData.sideEffects,['./queue-vanilla.js']);
    equal(packageData.dependencies['easy-stack'],'2.0.0');
    equal(packageLock.packages[''].dependencies['easy-stack'],'2.0.0');
    equal(packageLock.packages['node_modules/easy-stack'].version,'2.0.0');
    equal(packageData.devDependencies['vanilla-test'],'2.1.1');
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
