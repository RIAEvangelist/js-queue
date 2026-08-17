import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const selection=process.argv[2] || 'all';
const suites={
    all:['test/node.js','test/playground.js','test/package.js','test/server.js','test/docs.js'],
    core:['test/node.js'],
    playground:['test/playground.js'],
    package:['test/package.js'],
    server:['test/server.js'],
    docs:['test/docs.js'],
    legacy:['test/node.js','test/package.js']
};

if(!Object.prototype.hasOwnProperty.call(suites,selection)){
    console.error(`Unknown test selection: ${selection}`);
    process.exitCode=2;
}else{
    const environment={...process.env};
    if(selection === 'legacy'){
        environment.JS_QUEUE_TEST_LEGACY='1';
    }

    for(const file of suites[selection]){
        const result=spawnSync(process.execPath,[file],{
            cwd:fileURLToPath(new URL('../',import.meta.url)),
            env:environment,
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
