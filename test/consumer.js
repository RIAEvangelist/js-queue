import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deepEqual,equal,run,test} from './harness.js';

const rootPath=fileURLToPath(new URL('../',import.meta.url));
const npmCliPath=process.env.npm_execpath;
const nestedMarker='NESTED_EASY_STACK_2.1.0';

function execute(command,args,cwd){
    const result=spawnSync(command,args,{cwd,encoding:'utf8'});

    if(result.error){
        throw result.error;
    }

    if(result.status !== 0){
        throw new Error([
            `${command} ${args.join(' ')} exited with ${result.status}.`,
            result.stdout,
            result.stderr
        ].filter(Boolean).join('\n'));
    }

    return result.stdout.trim();
}

function executeNpm(args,cwd){
    if(!npmCliPath){
        throw new Error('npm_execpath is required; run this check through npm run test:consumer.');
    }
    return execute(process.execPath,[npmCliPath,...args],cwd);
}

function exerciseConsumer(consumerPath,format,specifier){
    const quotedSpecifier=JSON.stringify(specifier);
    const contract=format === 'esm'
        ? `import Stack,{Stack as NamedStack} from ${quotedSpecifier};\nif(Stack !== NamedStack) throw new Error('ESM Stack exports diverged.');`
        : `const Stack=require(${quotedSpecifier});\nif(Stack.Stack !== Stack) throw new Error('CommonJS Stack export diverged.');`;
    const source=`${contract}
const order=[];
const stack=new Stack;
stack.autoRun=false;
stack.add(
    function(){ order.push(1); this.next(); },
    function(){ order.push(2); this.next(); }
);
stack.next();
if(order.join(',') !== '2,1' || stack.running || stack.size !== 0){
    throw new Error('The packed Stack did not complete its LIFO contract.');
}
const loads=globalThis.__JS_QUEUE_EASY_STACK_LOADS__;
if(JSON.stringify(loads) !== ${JSON.stringify(JSON.stringify([nestedMarker]))}){
    throw new Error('Unexpected easy-stack resolution: '+JSON.stringify(loads));
}`;
    const args=format === 'esm'
        ? ['--input-type=module','--eval',source]
        : ['--eval',source];

    execute(process.execPath,args,consumerPath);
}

test('integration: packed consumer keeps the declared nested easy-stack across every stack module path',()=>{
    const fixturePath=fs.mkdtempSync(path.join(os.tmpdir(),'js-queue-packed-consumer-'));
    const consumerPath=path.join(fixturePath,'consumer');

    try{
        const packData=JSON.parse(executeNpm(
            ['pack','--json','--pack-destination',fixturePath],
            rootPath
        ));
        const tarballPath=path.join(fixturePath,packData[0].filename);
        equal(fs.existsSync(tarballPath),true,'npm pack did not create the expected tarball.');

        fs.mkdirSync(consumerPath);
        fs.writeFileSync(path.join(consumerPath,'package.json'),JSON.stringify({
            name:'js-queue-conflicting-consumer',
            private:true,
            type:'module',
            version:'1.0.0'
        },null,2));
        executeNpm(
            ['install','--ignore-scripts','--no-audit','--no-fund','--save-exact','easy-stack@2.0.0',tarballPath],
            consumerPath
        );

        const rootEasyStackPath=path.join(consumerPath,'node_modules','easy-stack');
        const packagePath=path.join(consumerPath,'node_modules','js-queue');
        const nestedEasyStackPath=path.join(packagePath,'node_modules','easy-stack');
        const rootManifest=JSON.parse(fs.readFileSync(path.join(rootEasyStackPath,'package.json'),'utf8'));
        const packageManifest=JSON.parse(fs.readFileSync(path.join(packagePath,'package.json'),'utf8'));
        const nestedManifest=JSON.parse(fs.readFileSync(path.join(nestedEasyStackPath,'package.json'),'utf8'));
        const dependencyTree=JSON.parse(executeNpm(['ls','--all','--json'],consumerPath));

        equal(rootManifest.version,'2.0.0');
        equal(packageManifest.version,'3.1.1');
        equal(packageManifest.dependencies['easy-stack'],'2.1.0');
        equal(nestedManifest.version,'2.1.0');
        equal(dependencyTree.dependencies['easy-stack'].version,'2.0.0');
        equal(dependencyTree.dependencies['js-queue'].version,'3.1.1');
        equal(dependencyTree.dependencies['js-queue'].dependencies['easy-stack'].version,'2.1.0');

        const audit=JSON.parse(executeNpm(
            ['audit','--omit=dev','--audit-level=high','--json'],
            consumerPath
        ));
        equal(audit.metadata.vulnerabilities.high,0);
        equal(audit.metadata.vulnerabilities.critical,0);

        fs.writeFileSync(
            path.join(rootEasyStackPath,'stack.js'),
            "globalThis.__JS_QUEUE_EASY_STACK_LOADS__=['ROOT_ESM_2.0.0'];\nthrow new Error('ROOT_EASY_STACK_2_0_0_ESM_POISON');\nexport {};\n"
        );
        fs.writeFileSync(
            path.join(rootEasyStackPath,'stack.cjs'),
            "globalThis.__JS_QUEUE_EASY_STACK_LOADS__=['ROOT_CJS_2.0.0'];\nthrow new Error('ROOT_EASY_STACK_2_0_0_CJS_POISON');\n"
        );
        const nestedEntryPath=path.join(nestedEasyStackPath,'stack.js');
        const nestedSource=fs.readFileSync(nestedEntryPath,'utf8');
        fs.writeFileSync(
            nestedEntryPath,
            `globalThis.__JS_QUEUE_EASY_STACK_LOADS__ ??=[];\nglobalThis.__JS_QUEUE_EASY_STACK_LOADS__.push(${JSON.stringify(nestedMarker)});\n${nestedSource}`
        );

        const cases=[
            ['esm','js-queue/stack'],
            ['esm','js-queue/stack.js'],
            ['commonjs','js-queue/stack'],
            ['commonjs','js-queue/stack.js']
        ];
        for(const [format,specifier] of cases){
            exerciseConsumer(consumerPath,format,specifier);
        }

        deepEqual(cases.map(([format,specifier])=>`${format}:${specifier}`),[
            'esm:js-queue/stack',
            'esm:js-queue/stack.js',
            'commonjs:js-queue/stack',
            'commonjs:js-queue/stack.js'
        ]);
    }finally{
        const resolvedFixture=path.resolve(fixturePath);
        const temporaryRoot=`${path.resolve(os.tmpdir())}${path.sep}`;
        if(!resolvedFixture.startsWith(temporaryRoot) || !path.basename(resolvedFixture).startsWith('js-queue-packed-consumer-')){
            throw new Error(`Refusing to remove unexpected fixture path: ${resolvedFixture}`);
        }
        fs.rmSync(resolvedFixture,{recursive:true,force:true});
    }
});

await run();
