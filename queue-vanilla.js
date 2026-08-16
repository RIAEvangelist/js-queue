(function exposeQueue(root){
    const queues=new WeakMap;
    const states=new WeakMap;

    function validateTasks(tasks){
        const invalidIndex=tasks.findIndex(task=>typeof task !== 'function');
        if(invalidIndex !== -1){
            throw new TypeError(`Queue task at index ${invalidIndex} must be a function.`);
        }
    }

    class Queue{
        constructor(){
            queues.set(this,[]);
            states.set(this,{running:false});
            this.autoRun=true;
            this.stop=false;
        }

        add(...tasks){
            validateTasks(tasks);
            queues.get(this).push(...tasks);

            if(!this.running && !this.stop && this.autoRun){
                this.next();
            }

            return this;
        }

        next(){
            const queue=queues.get(this);
            const state=states.get(this);

            if(this.stop || queue.length === 0){
                state.running=false;
                return;
            }

            state.running=true;
            const task=queue.shift();

            try{
                task.call(this);
            }catch(error){
                state.running=false;
                throw error;
            }
        }

        clear(){
            const queue=[];
            queues.set(this,queue);
            return queue;
        }

        get contents(){
            return queues.get(this);
        }

        set contents(tasks){
            if(!Array.isArray(tasks)){
                throw new TypeError('Queue contents must be an array of functions.');
            }

            validateTasks(tasks);
            queues.set(this,tasks);
        }

        get running(){
            return states.get(this).running;
        }

        get size(){
            return queues.get(this).length;
        }
    }

    Object.defineProperty(root,'Queue',{
        configurable:true,
        enumerable:true,
        value:Queue,
        writable:true
    });
})(globalThis);
