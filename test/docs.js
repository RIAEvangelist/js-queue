import fs from 'node:fs';
import {deepEqual,equal,run,test} from './harness.js';

const root=new URL('../',import.meta.url);
const pageNames=[
    'index.html',
    'guide/index.html',
    'api/index.html',
    'patterns/index.html',
    'browser/index.html',
    'examples/index.html',
    'playground/index.html',
    'stack/index.html',
    'migration/index.html',
    'testing/index.html',
    'testing/unit/index.html',
    'testing/functional/index.html',
    'testing/integration/index.html',
    'testing/regression/index.html'
];

function read(relativePath){
    return fs.readFileSync(new URL(relativePath,root),'utf8');
}

function testCaseNames(relativePaths,layer){
    const names=[];
    const prefix=`${layer}: `;

    for(const relativePath of relativePaths){
        const source=read(relativePath);
        const pattern=/test\('([^']+)'/g;
        let match;
        while((match=pattern.exec(source))){
            if(match[1].startsWith(prefix)){
                names.push(match[1].slice(prefix.length));
            }
        }
    }

    return names;
}

function localTargets(source){
    const targets=[];
    const pattern=/(?:href|src)="([^"]+)"/g;
    let match;

    while((match=pattern.exec(source))){
        const target=match[1];
        if(/^(?:https?:|mailto:|data:)/i.test(target)){
            continue;
        }
        targets.push(target);
    }

    return targets;
}

function targetExists(pageName,target){
    const base=new URL(pageName,root);
    const [pathPart,fragment]=target.split('#');
    let resolved=new URL(pathPart || base.href,base);

    if(resolved.pathname.endsWith('/')){
        resolved=new URL('index.html',resolved);
    }

    if(!fs.existsSync(resolved)){
        return false;
    }

    if(!fragment){
        return true;
    }

    return fs.readFileSync(resolved,'utf8').includes(`id="${decodeURIComponent(fragment)}"`);
}

test('regression: documentation remains split into fourteen focused pages',()=>{
    const missing=pageNames.filter(name=>!fs.existsSync(new URL(name,root)));
    deepEqual(missing,[]);
    equal(pageNames.length,14);
    equal(read('index.html').includes('<strong>14</strong><span>focused documentation pages</span>'),true);
});

test('regression: documentation pages retain their required short contracts',()=>{
    const required={
        'index.html':['overview','guarantees','routes'],
        'guide/index.html':['start','install','first-queue','model'],
        'api/index.html':['api','methods','state'],
        'patterns/index.html':['patterns','async','gates','errors'],
        'browser/index.html':['browser','esm','classic','serve'],
        'examples/index.html':['examples','live-demo','recipes'],
        'playground/index.html':['playground','controls','pending','code','trace'],
        'stack/index.html':['stack','entry','comparison'],
        'migration/index.html':['migration','changes','checklist'],
        'testing/index.html':['testing','suites','coverage','ci'],
        'testing/unit/index.html':['unit','cases','run'],
        'testing/functional/index.html':['functional','cases','run'],
        'testing/integration/index.html':['integration','cases','run'],
        'testing/regression/index.html':['regression','cases','run']
    };

    for(const [name,ids] of Object.entries(required)){
        const source=read(name);
        const missing=ids.filter(id=>!source.includes(`id="${id}"`));
        deepEqual(missing,[],`${name} is missing required sections.`);
    }
});

test('regression: every documentation page links to the Playground route',()=>{
    for(const pageName of pageNames){
        const source=read(pageName);
        const depth=pageName.split('/').length - 1;
        const href=`${depth === 0 ? './' : '../'.repeat(depth)}playground/`;
        equal(source.includes(`href="${href}"`),true,`${pageName} omits the Playground route.`);
    }
});

test('regression: every local page target and fragment resolves',()=>{
    const missing=[];

    for(const pageName of pageNames){
        const source=read(pageName);
        for(const target of localTargets(source)){
            if(!targetExists(pageName,target)){
                missing.push(`${pageName} -> ${target}`);
            }
        }
    }

    deepEqual(missing,[],'Missing local documentation targets.');
});

test('regression: documentation loads no remote runtime or content assets',()=>{
    for(const pageName of pageNames){
        const source=read(pageName);
        equal(/<script[^>]+src="https?:\/\//i.test(source),false,`${pageName} loads a remote script.`);
        equal(/<link[^>]+rel="stylesheet"[^>]+href="https?:\/\//i.test(source),false,`${pageName} loads a remote stylesheet.`);
        equal(/<img[^>]+src="https?:\/\//i.test(source),false,`${pageName} loads a remote image.`);
    }
    equal(/@import\s+url\(\s*['"]?https?:\/\//i.test(read('assets/site.css')),false);
});

test('regression: README begins with the generated local repository header',()=>{
    const readme=read('README.md');
    equal(readme.startsWith('![js-queue — explicit FIFO flow control for JavaScript](./assets/js-queue-header.png)'),true);
    equal(/avatars\d*\.githubusercontent\.com/i.test(readme),false);
});

test('regression: README links every primary focused documentation route',()=>{
    const readme=read('README.md');
    for(const path of ['guide/','api/','patterns/','browser/','examples/','playground/','testing/']){
        equal(readme.includes(`https://riaevangelist.github.io/js-queue/${path}`),true,`README omits ${path}.`);
    }
});

test('regression: repository header remains a responsive panoramic PNG',()=>{
    const image=fs.readFileSync(new URL('assets/js-queue-header.png',root));
    const width=image.readUInt32BE(16);
    const height=image.readUInt32BE(20);
    const heroTag=read('index.html').match(/<img class="hero-art"[^>]+>/)?.[0] || '';
    equal(image.toString('ascii',1,4),'PNG');
    equal(width >= 1500,true);
    equal(width / height >= 2.2,true);
    equal(image.byteLength > 250000,true);
    equal(heroTag.includes(`width="${width}"`),true);
    equal(heroTag.includes(`height="${height}"`),true);
    equal(/img\s*\{[^}]*height:auto;/s.test(read('assets/site.css')),true);
});

test('regression: vanilla-test artwork remains a substantial panoramic PNG',()=>{
    const image=fs.readFileSync(new URL('assets/vanilla-test-header.png',root));
    equal(image.toString('ascii',1,4),'PNG');
    equal(image.readUInt32BE(16) >= 1500,true);
    equal(image.readUInt32BE(16) / image.readUInt32BE(20) >= 2.2,true);
    equal(image.byteLength > 250000,true);
});

test('regression: repository and site visibly credit vanilla-test',()=>{
    const readme=read('README.md');
    const testingPage=read('testing/index.html');
    equal(readme.includes('Tested with [vanilla-test]'),true);
    equal(readme.includes('./assets/vanilla-test-header.png'),true);
    equal(testingPage.includes('Tested with vanilla-test.'),true);
    equal(testingPage.includes('../assets/vanilla-test-header.png'),true);
});

test('regression: Testing page publishes all four non-overlapping layers',()=>{
    const testingPage=read('testing/index.html');
    equal(testingPage.includes('90 focused checks'),true);
    equal(testingPage.includes('10 Unit'),true);
    equal(testingPage.includes('30 Functional'),true);
    equal(testingPage.includes('26 Integration'),true);
    equal(testingPage.includes('24 Regression'),true);
    equal(testingPage.includes('No duplicated cases.'),true);

    const layers={
        unit:{count:10,files:['test/unit.js'],page:'testing/unit/index.html'},
        functional:{count:30,files:['test/functional.js','test/playground.js'],page:'testing/functional/index.html'},
        integration:{count:26,files:['test/integration.js','test/package.js','test/server.js'],page:'testing/integration/index.html'},
        regression:{count:24,files:['test/regression.js','test/docs.js'],page:'testing/regression/index.html'}
    };
    const allNames=[];

    for(const [layer,contract] of Object.entries(layers)){
        const names=testCaseNames(contract.files,layer);
        const page=read(contract.page);
        equal(names.length,contract.count,`${layer} count is stale.`);
        for(const name of names){
            equal(page.includes(`<li>${name}</li>`),true,`${contract.page} omits ${name}.`);
            allNames.push(`${layer}: ${name}`);
        }
    }

    equal(allNames.length,90);
    equal(new Set(allNames).size,90,'Test inventory contains duplicate names.');
});

test('regression: package scripts expose every test layer independently',()=>{
    const packageData=JSON.parse(read('package.json'));
    const runner=read('scripts/test.js');
    const scripts={
        'test:unit':'node ./scripts/test.js unit',
        'test:functional':'node ./scripts/test.js functional',
        'test:integration':'node ./scripts/test.js integration',
        'test:regression':'node ./scripts/test.js regression'
    };
    for(const [name,command] of Object.entries(scripts)){
        equal(packageData.scripts[name],command);
        equal(runner.includes(name.split(':')[1]),true);
    }
    for(const file of ['test/unit.js','test/functional.js','test/integration.js','test/regression.js']){
        equal(fs.existsSync(new URL(file,root)),true,`${file} is missing.`);
    }
});

test('regression: vanilla-test and native coverage load every core layer',()=>{
    const packageData=JSON.parse(read('package.json'));
    const config=JSON.parse(read('vanilla-test.config.json'));
    const sharedEntry=read('test/CI.js');
    equal(packageData.devDependencies['vanilla-test'],'2.1.1');
    equal(packageData.scripts.coverage,'vanilla-test coverage');
    equal(config.entry,'./test/CI.js');
    equal(read('test/harness.js').includes("import('vanilla-test')"),true);
    for(const layer of ['unit','functional','integration','regression']){
        equal(sharedEntry.includes(`import './${layer}.js';`),true,`Coverage entry omits ${layer}.`);
    }
});

test('regression: Playground page and controller retain safe module wiring',()=>{
    const page=read('playground/index.html');
    const source=read('assets/playground.js');
    equal(page.includes('<script type="module" src="../assets/playground.js"></script>'),true);
    equal(page.includes('data-playground-code'),true);
    equal(source.startsWith("import Queue from '../queue.js';"),true);
    equal(/\beval\s*\(|new\s+Function\b|\.innerHTML\s*=|set(?:Timeout|Interval)\s*\(/.test(source),false);
});

test('regression: CI and Pages retain all delivery gates and curated assets',()=>{
    const ci=read('.github/workflows/ci.yml');
    const pages=read('.github/workflows/pages.yml');
    equal(ci.includes('npm test'),true);
    equal(ci.includes('npm run coverage'),true);
    equal(ci.includes("VANILLA_TEST_CHROME_NO_SANDBOX: '1'"),true);
    equal(ci.includes('NODE_ENV: production'),true);
    equal(ci.includes('npm install --ignore-scripts --no-audit --no-fund --package-lock=false'),true);
    equal(pages.includes('workflow_run:'),true);
    equal(pages.includes("github.event.workflow_run.conclusion == 'success'"),true);
    equal(pages.includes('actions/deploy-pages'),true);
    equal(pages.includes('_site/assets/playground.js'),true);
    equal(pages.includes('_site/assets/vanilla-test-header.png'),true);
    equal(pages.includes('_site/reports/node/index.html'),true);
    equal(pages.includes('_site/reports/chrome/index.html'),true);
    for(const layer of ['unit','functional','integration','regression']){
        equal(pages.includes(`_site/testing/${layer}/index.html`),true,`Pages workflow omits testing/${layer}.`);
    }
    for(const pageName of pageNames){
        equal(pages.includes(pageName.split('/')[0]),true,`Pages workflow omits ${pageName}.`);
    }
});

test('regression: project remains JavaScript-only',()=>{
    const forbidden=[];

    function inspect(directory){
        for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
            if(['.git','coverage','node_modules'].includes(entry.name)){
                continue;
            }
            const target=new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`,directory);
            if(entry.isDirectory()){
                inspect(target);
            }else if(/\.(?:ts|tsx)$/i.test(entry.name)){
                forbidden.push(target.href);
            }
        }
    }

    inspect(root);
    deepEqual(forbidden,[]);
});

await run();
