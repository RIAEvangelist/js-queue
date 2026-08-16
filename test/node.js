import run from './CI.js';

run().then(result=>{
    if(!result.ok){
        process.exitCode=1;
    }
});
