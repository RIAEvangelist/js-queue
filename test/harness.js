const tests=[];
const isNode=typeof process !== 'undefined' && process.versions && process.versions.node;
const quiet=isNode && process.env.JS_QUEUE_TEST_QUIET === '1';

function test(name,check){
    tests.push({name,check});
}

function assert(value,message='Expected condition to be true.'){
    if(!value){
        throw new Error(message);
    }
}

function equal(actual,expected,message='Values are not equal.'){
    if(!Object.is(actual,expected)){
        throw new Error(`${message} Expected ${String(expected)}, received ${String(actual)}.`);
    }
}

function deepEqual(actual,expected,message='Values are not deeply equal.'){
    const actualJSON=JSON.stringify(actual);
    const expectedJSON=JSON.stringify(expected);
    if(actualJSON !== expectedJSON){
        throw new Error(`${message} Expected ${expectedJSON}, received ${actualJSON}.`);
    }
}

function throws(check,ErrorType=Error,messagePart){
    let caught;

    try{
        check();
    }catch(error){
        caught=error;
    }

    assert(caught,`Expected ${ErrorType.name} to be thrown.`);
    assert(caught instanceof ErrorType,`Expected ${ErrorType.name}, received ${caught.constructor.name}.`);

    if(messagePart){
        assert(caught.message.includes(messagePart),`Expected error message to include ${messagePart}.`);
    }

    return caught;
}

function vanillaTestAvailable(){
    if(!isNode){
        return true;
    }

    if(process.env.JS_QUEUE_TEST_LEGACY === '1'){
        return false;
    }

    const [major,minor]=process.versions.node.split('.').map(Number);
    return major > 22 || (major === 22 && minor >= 12);
}

async function runVanilla(){
    const {default:VanillaTest}=await import('vanilla-test');
    const runner=new VanillaTest;

    for(const current of tests){
        runner.expects(current.name);

        try{
            await current.check();
            runner.pass();
        }catch(error){
            console.error(`✗ ${current.name}`);
            console.error(error && error.stack ? error.stack : error);
            runner.fail();
        }finally{
            runner.done();
        }
    }

    const result=runner.report();
    if(isNode && !result.ok){
        process.exitCode=1;
    }
    return result;
}

async function runFallback(){
    const passed=[];
    const failed=[];

    for(const current of tests){
        try{
            await current.check();
            passed.push(current.name);
            if(!quiet){
                console.log(`✓ ${current.name}`);
            }
        }catch(error){
            failed.push(current.name);
            console.error(`✗ ${current.name}`);
            console.error(error && error.stack ? error.stack : error);
        }
    }

    const result={
        passed,
        failed,
        total:tests.length,
        failureCount:failed.length,
        ok:failed.length === 0
    };
    console.log(`\n${passed.length} passed | ${failed.length} failed`);
    if(isNode && !result.ok){
        process.exitCode=1;
    }
    return result;
}

function run(){
    return vanillaTestAvailable() ? runVanilla() : runFallback();
}

export {assert,deepEqual,equal,run,test,throws};
