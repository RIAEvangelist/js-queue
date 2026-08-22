function validateTasks(tasks){
    const invalidIndex=tasks.findIndex(task=>typeof task !== 'function');
    if(invalidIndex !== -1){
        throw new TypeError(`Queue task at index ${invalidIndex} must be a function.`);
    }
}

class Queue{
    #contents=[];
    #running=false;

    constructor(){
        this.autoRun=true;
        this.stop=false;
    }

    add(...tasks){
        validateTasks(tasks);
        this.#contents.push(...tasks);

        if(!this.#running && !this.stop && this.autoRun){
            this.next();
        }

        return this;
    }

    next(){
        if(this.stop || this.#contents.length === 0){
            this.#running=false;
            return;
        }

        this.#running=true;
        const task=this.#contents.shift();

        try{
            task.call(this);
        }catch(error){
            this.#running=false;
            throw error;
        }
    }

    clear(){
        this.#contents=[];
        return this.#contents;
    }

    get contents(){
        return this.#contents;
    }

    set contents(tasks){
        if(!Array.isArray(tasks)){
            throw new TypeError('Queue contents must be an array of functions.');
        }

        validateTasks(tasks);
        this.#contents=tasks;
    }

    get running(){
        return this.#running;
    }

    get size(){
        return this.#contents.length;
    }
}

Queue.Queue=Queue;

export {
    Queue as default,
    Queue,
    Queue as 'module.exports'
};
