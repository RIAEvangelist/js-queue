import Queue from 'js-queue';

const root=document.querySelector('[data-queue-demo]');

if(root){
    const runButton=root.querySelector('[data-demo-run]');
    const stopButton=root.querySelector('[data-demo-stop]');
    const clearButton=root.querySelector('[data-demo-clear]');
    const status=root.querySelector('[data-demo-status]');
    const tasks=[...root.querySelectorAll('[data-demo-task]')];
    const labels=['prepare','connect','send','record'];
    const delays=[520,720,620,480];
    let queue;
    let generation=0;

    function setTaskState(index,state){
        tasks[index].dataset.state=state;
    }

    function updateStatus(message){
        if(message){
            status.textContent=message;
            return;
        }

        if(!queue){
            status.textContent='Ready · 4 tasks';
        }else if(queue.stop){
            status.textContent=`Paused · ${queue.size} pending`;
        }else if(queue.running){
            status.textContent=`Running · ${queue.size} pending`;
        }else if(queue.size){
            status.textContent=`Idle · ${queue.size} pending`;
        }else{
            status.textContent='Complete · FIFO order preserved';
        }
    }

    function buildQueue(){
        generation++;
        const currentGeneration=generation;
        queue=new Queue;
        queue.autoRun=false;

        tasks.forEach(task=>{ delete task.dataset.state; });

        labels.forEach((label,index)=>{
            queue.add(function(){
                if(currentGeneration !== generation){
                    return;
                }
                setTaskState(index,'active');
                updateStatus();
                setTimeout(()=>{
                    if(currentGeneration !== generation){
                        return;
                    }
                    setTaskState(index,'done');
                    this.next();
                    updateStatus();
                    if(!this.running && this.size === 0){
                        stopButton.disabled=true;
                        clearButton.disabled=true;
                    }
                },delays[index]);
            });
        });
    }

    runButton.addEventListener('click',()=>{
        buildQueue();
        runButton.textContent='Restart queue';
        stopButton.textContent='Pause';
        stopButton.disabled=false;
        clearButton.disabled=false;
        queue.next();
        updateStatus();
    });

    stopButton.addEventListener('click',()=>{
        queue.stop=!queue.stop;
        stopButton.textContent=queue.stop ? 'Resume' : 'Pause';
        if(!queue.stop && !queue.running){
            queue.next();
        }
        updateStatus();
    });

    clearButton.addEventListener('click',()=>{
        generation++;
        queue.clear();
        queue.stop=true;
        for(const task of tasks){
            if(task.dataset.state !== 'done'){
                task.dataset.state='cleared';
            }
        }
        stopButton.disabled=true;
        clearButton.disabled=true;
        updateStatus('Cleared · no pending tasks');
    });
}
