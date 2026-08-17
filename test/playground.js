import {createPlayground} from '../assets/playground.js';
import {deepEqual,equal,run,test,throws} from './harness.js';

test('the cooperative preset displays and drains strict FIFO order',()=>{
    const playground=createPlayground();
    let state=playground.load('cooperative');

    deepEqual(state.pending,['prepare','connect','send']);
    deepEqual(state.trace,[]);
    equal(state.autoRun,false);
    equal(state.running,false);

    state=playground.next();
    deepEqual(state.trace,['prepare','connect','send']);
    deepEqual(state.pending,[]);
    equal(state.size,0);
    equal(state.running,false);
});

test('manual tasks require one explicit hand-off per transition',()=>{
    const playground=createPlayground();
    playground.load('manual');

    let state=playground.next();
    deepEqual(state.trace,['prepare']);
    deepEqual(state.pending,['connect','send']);
    equal(state.running,true);

    state=playground.next();
    deepEqual(state.trace,['prepare','connect']);
    deepEqual(state.pending,['send']);

    state=playground.next();
    deepEqual(state.trace,['prepare','connect','send']);
    equal(state.size,0);
    equal(state.running,true);

    state=playground.next();
    equal(state.running,false);
    equal(state.lastAction,'An empty hand-off marked the queue idle.');
});

test('stopped work remains pending until stop is released and next is selected',()=>{
    const playground=createPlayground();
    let state=playground.load('stopped');

    equal(state.autoRun,true);
    state=playground.next();
    deepEqual(state.pending,['prepare','connect','send']);
    deepEqual(state.trace,[]);
    equal(state.stop,true);

    state=playground.setStop(false);
    deepEqual(state.trace,[]);
    equal(state.stop,false);

    state=playground.next();
    deepEqual(state.trace,['prepare','connect','send']);
    equal(state.running,false);
});

test('clear preserves flags and activity while reset restores constructor defaults',()=>{
    const playground=createPlayground();
    playground.load('manual');
    playground.next();
    playground.setAutoRun(true);
    playground.setStop(true);

    let state=playground.clear();
    equal(state.size,0);
    equal(state.running,true);
    equal(state.autoRun,true);
    equal(state.stop,true);
    deepEqual(state.trace,['prepare']);

    state=playground.reset();
    equal(state.size,0);
    equal(state.running,false);
    equal(state.autoRun,true);
    equal(state.stop,false);
    deepEqual(state.trace,[]);
});

test('custom tasks are validated and displayed oldest-first',()=>{
    const playground=createPlayground();
    playground.setAutoRun(false);
    playground.add('older',{autoHandoff:false});
    const state=playground.add('newer',{autoHandoff:false});

    deepEqual(state.pending,['older','newer']);
    throws(()=>playground.add('   '),TypeError,'must not be empty');
    throws(()=>playground.add('x'.repeat(61)),RangeError,'60 characters');
    throws(()=>playground.load('missing'),RangeError,'Unknown playground preset');
});

test('autoRun applies synchronously to new work without starting an existing batch',()=>{
    const playground=createPlayground();
    let state=playground.load('manual');

    state=playground.setAutoRun(true);
    deepEqual(state.trace,[]);
    deepEqual(state.pending,['prepare','connect','send']);

    state=playground.reset();
    state=playground.add('cooperative',{autoHandoff:true});
    deepEqual(state.trace,['cooperative']);
    equal(state.size,0);
    equal(state.running,false);

    state=playground.reset();
    state=playground.add('manual',{autoHandoff:false});
    deepEqual(state.trace,['manual']);
    equal(state.size,0);
    equal(state.running,true);
});

test('related code follows presets and every queue control',()=>{
    const playground=createPlayground();
    let state=playground.load('manual');

    equal(state.codeLabel,'Load Manual hand-off');
    equal(state.code.includes('queue.autoRun=false;'),true);
    equal(state.code.includes("console.log(\"prepare\")"),true);

    state=playground.add('review',{autoHandoff:true});
    equal(state.codeLabel,'Add “review”');
    equal(state.code.includes('this.next();'),true);

    state=playground.setAutoRun(true);
    equal(state.code,'queue.autoRun=true;');
    state=playground.setStop(true);
    equal(state.code,'queue.stop=true;');
    state=playground.setStop(false);
    equal(state.code,'queue.stop=false;');
    state=playground.next();
    equal(state.code,'queue.next();');
    state=playground.clear();
    equal(state.code,'queue.clear();');
    state=playground.reset();
    equal(state.code,'const queue=new Queue;');
});

await run();
