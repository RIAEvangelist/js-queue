import Queue from '../queue.js';
import {deepEqual,equal,test} from './harness.js';

test('integration: work added by an active task joins the FIFO tail',()=>{
    const queue=new Queue;
    const order=[];
    queue.add(
        function(){
            order.push('active');
            this.add(function(){ order.push('added'); this.next(); });
            this.next();
        },
        function(){ order.push('existing'); this.next(); }
    );
    deepEqual(order,['active','existing','added']);
    equal(queue.running,false);
});

test('integration: an active task can stop the next hand-off',()=>{
    const queue=new Queue;
    const order=[];
    queue.add(
        function(){
            order.push('pause');
            this.stop=true;
            this.next();
        },
        function(){ order.push('blocked'); this.next(); }
    );
    deepEqual(order,['pause']);
    equal(queue.running,false);
    equal(queue.size,1);
});

test('integration: replacement contents execute through the normal hand-off',()=>{
    const queue=new Queue;
    const order=[];
    queue.autoRun=false;
    queue.contents=[function(){ order.push('replacement'); this.next(); }];
    queue.next();
    deepEqual(order,['replacement']);
    equal(queue.size,0);
});

test('integration: clear inside an active task removes only pending work',()=>{
    const queue=new Queue;
    const order=[];
    let cleared;
    queue.add(
        function(){
            order.push('active');
            cleared=this.clear();
            this.next();
        },
        function(){ order.push('removed'); this.next(); }
    );
    deepEqual(cleared,[]);
    deepEqual(order,['active']);
    equal(queue.running,false);
});

test('integration: an asynchronous callback releases the next FIFO task',async()=>{
    const queue=new Queue;
    const order=[];
    await new Promise(resolve=>{
        queue.add(
            function(){
                order.push('request started');
                setTimeout(()=>{
                    order.push('request finished');
                    this.next();
                },0);
            },
            function(){
                order.push('next task');
                this.next();
                resolve();
            }
        );
    });
    deepEqual(order,['request started','request finished','next task']);
    equal(queue.running,false);
});
