import Queue from '../queue.js';

const presets=Object.freeze({
    cooperative:Object.freeze({
        autoHandoff:true,
        autoRun:false,
        label:'Cooperative FIFO batch',
        stop:false,
        tasks:Object.freeze(['prepare','connect','send'])
    }),
    manual:Object.freeze({
        autoHandoff:false,
        autoRun:false,
        label:'Manual hand-off',
        stop:false,
        tasks:Object.freeze(['prepare','connect','send'])
    }),
    stopped:Object.freeze({
        autoHandoff:true,
        autoRun:true,
        label:'Stopped FIFO batch',
        stop:true,
        tasks:Object.freeze(['prepare','connect','send'])
    })
});

function codeForTask(label,autoHandoff){
    const lines=[
        '    function task(){',
        `        console.log(${JSON.stringify(label)});`
    ];

    lines.push(autoHandoff
        ? '        this.next();'
        : '        // Wait for another queue.next() call.');
    lines.push('    }');
    return lines;
}

function codeForPreset(preset){
    const lines=[
        "import Queue from '../queue.js';",
        '',
        'const queue=new Queue;',
        `queue.autoRun=${preset.autoRun};`,
        `queue.stop=${preset.stop};`,
        '',
        'queue.add('
    ];

    preset.tasks.forEach((label,index)=>{
        const taskLines=codeForTask(label,preset.autoHandoff);
        taskLines[taskLines.length-1]+=index === preset.tasks.length-1 ? '' : ',';
        lines.push(...taskLines);
    });
    lines.push(');');
    return lines.join('\n');
}

function createPlayground(){
    let code;
    let codeLabel;
    let labels;
    let lastAction;
    let queue;
    let trace;

    function createFreshQueue(){
        labels=new WeakMap();
        queue=new Queue();
        trace=[];
        lastAction='Created a new queue with constructor defaults.';
        codeLabel='Reset queue';
        code='const queue=new Queue;';
    }

    function makeTask(label,autoHandoff){
        const task=function playgroundTask(){
            trace.push(label);
            lastAction=autoHandoff
                ? `Ran “${label}” and yielded with next().`
                : `Ran “${label}” and paused for a manual hand-off.`;

            if(autoHandoff){
                this.next();
            }
        };

        labels.set(task,label);
        return task;
    }

    function snapshot(){
        const pending=[...queue.contents]
            .map(task=>labels.get(task) || task.name || 'anonymous task');

        return Object.freeze({
            autoRun:Boolean(queue.autoRun),
            code,
            codeLabel,
            lastAction,
            pending:Object.freeze(pending),
            running:queue.running,
            size:queue.size,
            stop:Boolean(queue.stop),
            trace:Object.freeze([...trace])
        });
    }

    function load(presetName){
        const preset=presets[presetName];

        if(!preset){
            throw new RangeError(`Unknown playground preset: ${presetName}.`);
        }

        createFreshQueue();
        queue.autoRun=preset.autoRun;
        queue.stop=preset.stop;

        for(const label of preset.tasks){
            queue.add(makeTask(label,preset.autoHandoff));
        }

        lastAction=`Loaded “${preset.label}” with ${queue.size} pending tasks.`;
        codeLabel=`Load ${preset.label}`;
        code=codeForPreset(preset);
        return snapshot();
    }

    function add(label,{autoHandoff=true}={}){
        if(typeof label !== 'string'){
            throw new TypeError('Task label must be a string.');
        }

        const normalized=label.trim();
        if(normalized.length === 0){
            throw new TypeError('Task label must not be empty.');
        }
        if(normalized.length > 60){
            throw new RangeError('Task label must be 60 characters or fewer.');
        }

        const handoff=Boolean(autoHandoff);
        const traceLength=trace.length;
        codeLabel=`Add “${normalized}”`;
        code=['queue.add(',...codeForTask(normalized,handoff),');'].join('\n');
        queue.add(makeTask(normalized,handoff));

        if(trace.length === traceLength){
            lastAction=`Added “${normalized}” to the end of the queue.`;
        }

        return snapshot();
    }

    function next(){
        const sizeBefore=queue.size;
        const traceLength=trace.length;
        codeLabel='Select Next';
        code='queue.next();';
        queue.next();

        if(trace.length === traceLength){
            if(queue.stop){
                lastAction='Next was blocked because stop is true.';
            }else if(sizeBefore === 0){
                lastAction='An empty hand-off marked the queue idle.';
            }else{
                lastAction='No pending task ran.';
            }
        }

        return snapshot();
    }

    function setAutoRun(value){
        queue.autoRun=Boolean(value);
        codeLabel='Change autoRun';
        code=`queue.autoRun=${queue.autoRun};`;
        lastAction=queue.size === 0
            ? `Set autoRun to ${queue.autoRun}. No work is pending.`
            : `Set autoRun to ${queue.autoRun}. Existing work still waits for next().`;
        return snapshot();
    }

    function setStop(value){
        queue.stop=Boolean(value);
        codeLabel='Change stop';
        code=`queue.stop=${queue.stop};`;
        if(queue.size === 0){
            lastAction=`Set stop to ${queue.stop}. No work is pending.`;
        }else{
            lastAction=queue.stop
                ? 'Set stop to true. Work remains pending.'
                : 'Released stop. Select Next to resume pending work.';
        }
        return snapshot();
    }

    function clear(){
        const removed=queue.size;
        queue.clear();
        codeLabel='Clear pending';
        code='queue.clear();';
        lastAction=`Cleared ${removed} pending ${removed === 1 ? 'task' : 'tasks'} without changing state flags.`;
        return snapshot();
    }

    function reset(){
        createFreshQueue();
        return snapshot();
    }

    createFreshQueue();

    return Object.freeze({add,clear,load,next,reset,setAutoRun,setStop,snapshot});
}

function bootPlayground(root){
    if(!root){
        return;
    }

    const controller=createPlayground();
    const preset=root.querySelector('[data-playground-preset]');
    const loadButton=root.querySelector('[data-playground-load]');
    const addForm=root.querySelector('[data-playground-add]');
    const labelInput=root.querySelector('[data-playground-label]');
    const handoff=root.querySelector('[data-playground-handoff]');
    const autoRun=root.querySelector('[data-playground-auto-run]');
    const stop=root.querySelector('[data-playground-stop]');
    const nextButton=root.querySelector('[data-playground-next]');
    const releaseButton=root.querySelector('[data-playground-release]');
    const clearButton=root.querySelector('[data-playground-clear]');
    const resetButton=root.querySelector('[data-playground-reset]');
    const pendingList=root.querySelector('[data-playground-pending]');
    const traceList=root.querySelector('[data-playground-trace]');
    const status=root.querySelector('[data-playground-status]');
    const size=root.querySelector('[data-playground-size]');
    const running=root.querySelector('[data-playground-running]');
    const autoRunValue=root.querySelector('[data-playground-auto-run-value]');
    const stopValue=root.querySelector('[data-playground-stop-value]');
    const codeLabel=root.querySelector('[data-playground-code-label]');
    const code=root.querySelector('[data-playground-code]');

    function replaceList(list,items,emptyMessage,{frontLabel=false}={}){
        const children=[];

        if(items.length === 0){
            const item=document.createElement('li');
            item.className='playground-list__empty';
            item.textContent=emptyMessage;
            children.push(item);
        }else{
            items.forEach((value,index)=>{
                const item=document.createElement('li');
                const text=document.createElement('span');
                text.textContent=value;

                if(frontLabel && index === 0){
                    const marker=document.createElement('strong');
                    marker.textContent='Front · oldest';
                    item.append(marker);
                }

                item.append(text);
                children.push(item);
            });
        }

        list.replaceChildren(...children);
    }

    function render(state){
        autoRun.checked=state.autoRun;
        stop.checked=state.stop;
        size.textContent=String(state.size);
        running.textContent=String(state.running);
        autoRunValue.textContent=String(state.autoRun);
        stopValue.textContent=String(state.stop);
        releaseButton.disabled=!state.stop;
        clearButton.disabled=state.size === 0;
        status.textContent=`${state.lastAction} ${state.size} pending.`;
        codeLabel.textContent=state.codeLabel;
        code.textContent=state.code;
        replaceList(pendingList,state.pending,'No pending tasks.',{frontLabel:true});
        replaceList(traceList,state.trace,'No task has run yet.');
    }

    loadButton.addEventListener('click',()=>render(controller.load(preset.value)));

    addForm.addEventListener('submit',event=>{
        event.preventDefault();
        const label=labelInput.value.trim();

        if(label.length === 0){
            labelInput.setCustomValidity('Enter a task label.');
            labelInput.reportValidity();
            return;
        }

        labelInput.setCustomValidity('');
        render(controller.add(label,{autoHandoff:handoff.value === 'cooperative'}));
        labelInput.value='';
        labelInput.focus();
    });

    labelInput.addEventListener('input',()=>labelInput.setCustomValidity(''));
    autoRun.addEventListener('change',()=>render(controller.setAutoRun(autoRun.checked)));
    stop.addEventListener('change',()=>render(controller.setStop(stop.checked)));
    nextButton.addEventListener('click',()=>render(controller.next()));
    releaseButton.addEventListener('click',()=>render(controller.setStop(false)));
    clearButton.addEventListener('click',()=>render(controller.clear()));
    resetButton.addEventListener('click',()=>{
        render(controller.reset());
        labelInput.focus();
    });

    render(controller.load(preset.value));
    return controller;
}

if(typeof document !== 'undefined'){
    bootPlayground(document.querySelector('[data-playground]'));
}

export {bootPlayground,createPlayground};
