const selection=process.argv[2] || 'all';
const files={
    unit:'./unit.js',
    functional:'./functional.js',
    integration:'./integration.js',
    regression:'./regression.js'
};

async function main(){
    let run;

    if(selection === 'all'){
        ({default:run}=await import('./CI.js'));
    }else if(Object.prototype.hasOwnProperty.call(files,selection)){
        await import(files[selection]);
        ({run}=await import('./harness.js'));
    }else{
        console.error(`Unknown core test layer: ${selection}`);
        process.exitCode=2;
        return;
    }

    const result=await run();
    if(!result.ok){
        process.exitCode=1;
    }
}

main();
