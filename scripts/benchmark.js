import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import Queue from '../queue.js';

const baselineVersion='3.0.0';
const packageData=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const iterations=Number(process.env.BENCHMARK_ITERATIONS || 100000);
const samples=Number(process.env.BENCHMARK_SAMPLES || 21);
const require=createRequire(import.meta.url);
let constructionSink;

if(!Number.isSafeInteger(iterations) || iterations < 1){
    throw new TypeError('BENCHMARK_ITERATIONS must be a positive integer.');
}

if(!Number.isSafeInteger(samples) || samples < 3){
    throw new TypeError('BENCHMARK_SAMPLES must be an integer of at least 3.');
}

function loadBaseline(){
    const source=execFileSync('git',['show',`${baselineVersion}:queue.cjs`],{
        cwd:new URL('../',import.meta.url),
        encoding:'utf8'
    });
    const temporaryDirectory=fs.mkdtempSync(path.join(os.tmpdir(),'js-queue-benchmark-'));
    const temporaryModule=path.join(temporaryDirectory,'queue.cjs');
    try{
        fs.writeFileSync(temporaryModule,source);
        return require(temporaryModule);
    }finally{
        fs.rmSync(temporaryDirectory,{recursive:true});
    }
}

function construct(Type,count){
    const queues=new Array(count);
    for(let index=0;index<count;index+=1){
        queues[index]=new Type;
    }
    let checksum=0;
    for(const queue of queues){
        checksum+=Number(queue.autoRun) + queue.size;
    }
    constructionSink=queues;
    return checksum;
}

function scheduleAndDrain(Type,count){
    const queue=new Type;
    let completed=0;
    function task(){
        completed+=1;
        this.next();
    }
    for(let index=0;index<count;index+=1){
        queue.add(task);
    }
    return completed + queue.size + Number(queue.running);
}

function duration(action){
    constructionSink=undefined;
    global.gc?.();
    const started=performance.now();
    const checksum=action();
    return {checksum,milliseconds:performance.now()-started};
}

function median(values){
    const ordered=[...values].sort((left,right)=>left-right);
    const midpoint=Math.floor(ordered.length/2);
    return ordered.length % 2 ? ordered[midpoint] : (ordered[midpoint-1]+ordered[midpoint])/2;
}

function compare(label,action){
    const baseline=[];
    const candidate=[];
    const warmupIterations=Math.max(1000,Math.floor(iterations/10));

    for(let index=0;index<3;index+=1){
        action(BaselineQueue,warmupIterations);
        action(Queue,warmupIterations);
    }

    for(let index=0;index<samples;index+=1){
        const order=index % 2 ? [[Queue,candidate],[BaselineQueue,baseline]] : [[BaselineQueue,baseline],[Queue,candidate]];
        for(const [Type,results] of order){
            const measured=duration(()=>action(Type,iterations));
            if(measured.checksum !== iterations){
                throw new Error(`${label} produced an invalid checksum.`);
            }
            results.push(measured.milliseconds);
        }
    }

    const baselineMedian=median(baseline);
    const candidateMedian=median(candidate);
    return {
        label,
        iterations,
        unit:'milliseconds',
        baseline:Number(baselineMedian.toFixed(2)),
        candidate:Number(candidateMedian.toFixed(2)),
        speedup:Number((baselineMedian/candidateMedian).toFixed(2))
    };
}

const BaselineQueue=loadBaseline();
const results={
    package:packageData.name,
    baseline:`${baselineVersion} WeakMap state`,
    candidate:`${packageData.version} private fields`,
    methodology:`Median of ${samples} alternating samples; lower is faster.`,
    runtime:process.version,
    platform:`${process.platform} ${process.arch}`,
    processor:os.cpus()[0]?.model || 'unknown',
    metrics:[
        compare('Construct instances',construct),
        compare('Schedule and drain tasks',scheduleAndDrain)
    ]
};

process.stdout.write(`${JSON.stringify(results,null,2)}\n`);
