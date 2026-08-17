import {createPlayground} from '../assets/playground.js';
import {deepEqual,equal,run,test,throws} from './harness.js';

test('functional: playground cooperative preset exposes FIFO pending order',()=>{
    const state=createPlayground().load('cooperative');
    deepEqual(state.pending,['prepare','connect','send']);
    deepEqual(state.trace,[]);
    equal(state.autoRun,false);
    equal(state.running,false);
});

test('functional: playground cooperative next drains the complete trace',()=>{
    const playground=createPlayground();
    playground.load('cooperative');
    const state=playground.next();
    deepEqual(state.trace,['prepare','connect','send']);
    deepEqual(state.pending,[]);
    equal(state.size,0);
    equal(state.running,false);
});

test('functional: playground manual next advances exactly one task',()=>{
    const playground=createPlayground();
    playground.load('manual');
    const state=playground.next();
    deepEqual(state.trace,['prepare']);
    deepEqual(state.pending,['connect','send']);
    equal(state.running,true);
});

test('functional: playground manual hand-offs preserve FIFO order',()=>{
    const playground=createPlayground();
    playground.load('manual');
    playground.next();
    playground.next();
    const state=playground.next();
    deepEqual(state.trace,['prepare','connect','send']);
    equal(state.size,0);
    equal(state.running,true);
});

test('functional: playground empty hand-off marks a manual queue idle',()=>{
    const playground=createPlayground();
    playground.load('manual');
    playground.next();
    playground.next();
    playground.next();
    const state=playground.next();
    equal(state.running,false);
    equal(state.lastAction,'An empty hand-off marked the queue idle.');
});

test('functional: playground stopped preset blocks next without consuming work',()=>{
    const playground=createPlayground();
    playground.load('stopped');
    const state=playground.next();
    equal(state.autoRun,true);
    equal(state.stop,true);
    deepEqual(state.pending,['prepare','connect','send']);
    deepEqual(state.trace,[]);
});

test('functional: playground stop release does not execute work by itself',()=>{
    const playground=createPlayground();
    playground.load('stopped');
    playground.next();
    const state=playground.setStop(false);
    equal(state.stop,false);
    deepEqual(state.pending,['prepare','connect','send']);
    deepEqual(state.trace,[]);
});

test('functional: playground next after stop release drains FIFO work',()=>{
    const playground=createPlayground();
    playground.load('stopped');
    playground.setStop(false);
    const state=playground.next();
    deepEqual(state.trace,['prepare','connect','send']);
    equal(state.size,0);
    equal(state.running,false);
});

test('functional: playground clear preserves flags and active trace',()=>{
    const playground=createPlayground();
    playground.load('manual');
    playground.next();
    playground.setAutoRun(true);
    playground.setStop(true);
    const state=playground.clear();
    equal(state.size,0);
    equal(state.running,true);
    equal(state.autoRun,true);
    equal(state.stop,true);
    deepEqual(state.trace,['prepare']);
});

test('functional: playground reset restores constructor defaults',()=>{
    const playground=createPlayground();
    playground.load('manual');
    playground.next();
    playground.setStop(true);
    const state=playground.reset();
    equal(state.size,0);
    equal(state.running,false);
    equal(state.autoRun,true);
    equal(state.stop,false);
    deepEqual(state.trace,[]);
});

test('functional: playground custom tasks display oldest first',()=>{
    const playground=createPlayground();
    playground.setAutoRun(false);
    playground.add('older',{autoHandoff:false});
    const state=playground.add('newer',{autoHandoff:false});
    deepEqual(state.pending,['older','newer']);
});

test('functional: playground rejects an empty custom label',()=>{
    const playground=createPlayground();
    throws(()=>playground.add('   '),TypeError,'must not be empty');
});

test('functional: playground rejects a custom label over sixty characters',()=>{
    const playground=createPlayground();
    throws(()=>playground.add('x'.repeat(61)),RangeError,'60 characters');
});

test('functional: playground rejects an unknown preset',()=>{
    const playground=createPlayground();
    throws(()=>playground.load('missing'),RangeError,'Unknown playground preset');
});

test('functional: playground autoRun changes do not start existing work',()=>{
    const playground=createPlayground();
    playground.load('manual');
    const state=playground.setAutoRun(true);
    deepEqual(state.trace,[]);
    deepEqual(state.pending,['prepare','connect','send']);
});

test('functional: playground autoRun drains a new cooperative task',()=>{
    const playground=createPlayground();
    playground.reset();
    const state=playground.add('cooperative',{autoHandoff:true});
    deepEqual(state.trace,['cooperative']);
    equal(state.size,0);
    equal(state.running,false);
});

test('functional: playground autoRun leaves a new manual task active',()=>{
    const playground=createPlayground();
    playground.reset();
    const state=playground.add('manual',{autoHandoff:false});
    deepEqual(state.trace,['manual']);
    equal(state.size,0);
    equal(state.running,true);
});

test('functional: playground preset code describes the loaded queue',()=>{
    const state=createPlayground().load('manual');
    equal(state.codeLabel,'Load Manual hand-off');
    equal(state.code.includes('queue.autoRun=false;'),true);
    equal(state.code.includes('queue.stop=false;'),true);
    equal(state.code.includes('console.log("prepare")'),true);
});

test('functional: playground added-task code matches its hand-off behavior',()=>{
    const playground=createPlayground();
    playground.load('manual');
    const cooperative=playground.add('review',{autoHandoff:true});
    equal(cooperative.codeLabel,'Add “review”');
    equal(cooperative.code.includes('console.log("review")'),true);
    equal(cooperative.code.includes('this.next();'),true);

    const manual=playground.add('approve',{autoHandoff:false});
    equal(manual.codeLabel,'Add “approve”');
    equal(manual.code.includes('this.next();'),false);
});

test('functional: playground queue controls expose their exact related code',()=>{
    const playground=createPlayground();
    equal(playground.setAutoRun(false).code,'queue.autoRun=false;');
    equal(playground.setStop(true).code,'queue.stop=true;');
    equal(playground.setStop(false).code,'queue.stop=false;');
    equal(playground.next().code,'queue.next();');
    equal(playground.clear().code,'queue.clear();');
    equal(playground.reset().code,'const queue=new Queue;');
});

await run();
