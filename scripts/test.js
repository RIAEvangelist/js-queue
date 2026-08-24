import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const selection=process.argv[2] || 'all';
const suites={
    all:[['test/node.js'],['test/playground.js'],['test/package.js'],['test/consumer.js'],['test/server.js'],['test/docs.js']],
    unit:[['test/node.js','unit']],
    functional:[['test/node.js','functional'],['test/playground.js']],
    behavioral:[['test/node.js','behavioral']],
    integration:[['test/node.js','integration'],['test/package.js'],['test/consumer.js'],['test/server.js']],
    regression:[['test/node.js','regression'],['test/docs.js']],
    core:[['test/node.js']],
    playground:[['test/playground.js']],
    package:[['test/package.js']],
    consumer:[['test/consumer.js']],
    server:[['test/server.js']],
    docs:[['test/docs.js']]
};

if(!Object.prototype.hasOwnProperty.call(suites,selection)){
    console.error(`Unknown test selection: ${selection}`);
    process.exitCode=2;
}else{
    for(const [file,...args] of suites[selection]){
        const result=spawnSync(process.execPath,[file,...args],{
            cwd:fileURLToPath(new URL('../',import.meta.url)),
            env:process.env,
            stdio:'inherit'
        });

        if(result.error){
            throw result.error;
        }

        if(result.status !== 0){
            process.exitCode=result.status || 1;
            break;
        }
    }
}
