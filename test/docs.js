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
    'testing/index.html'
];

function read(relativePath){
    return fs.readFileSync(new URL(relativePath,root),'utf8');
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

test('the documentation is split into ten focused pages',()=>{
    const missing=pageNames.filter(name=>!fs.existsSync(new URL(name,root)));
    deepEqual(missing,[]);
    equal(pageNames.length,10);
});

test('every page exposes its short, page-specific contract',()=>{
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
        'testing/index.html':['testing','suites','coverage','ci']
    };

    for(const [name,ids] of Object.entries(required)){
        const source=read(name);
        const missing=ids.filter(id=>!source.includes(`id="${id}"`));
        deepEqual(missing,[],`${name} is missing required sections.`);
        const playgroundHref=name === 'index.html' ? './playground/' : '../playground/';
        equal(source.includes(`href="${playgroundHref}"`),true,`${name} omits the Playground route.`);
    }
});

test('every local page link, script, stylesheet, image, and fragment resolves',()=>{
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

test('the site loads no remote script, stylesheet, font, or content image',()=>{
    for(const pageName of pageNames){
        const source=read(pageName);
        const remoteScript=/<script[^>]+src="https?:\/\//i.test(source);
        const remoteStylesheet=/<link[^>]+rel="stylesheet"[^>]+href="https?:\/\//i.test(source);
        const remoteImage=/<img[^>]+src="https?:\/\//i.test(source);
        equal(remoteScript || remoteStylesheet || remoteImage,false,`${pageName} loads a remote asset.`);
    }
    equal(/@import\s+url\(\s*['"]?https?:\/\//i.test(read('assets/site.css')),false);
});

test('README leads with the generated local header and links the focused docs',()=>{
    const readme=read('README.md');
    equal(readme.startsWith('![js-queue — explicit FIFO flow control for JavaScript](./assets/js-queue-header.png)'),true);
    for(const path of ['guide/','api/','patterns/','browser/','examples/','playground/','testing/']){
        equal(readme.includes(`https://riaevangelist.github.io/js-queue/${path}`),true,`README omits ${path}.`);
    }
    equal(/avatars\d*\.githubusercontent\.com/i.test(readme),false);
});

test('the repository header is a substantial panoramic PNG',()=>{
    const image=fs.readFileSync(new URL('assets/js-queue-header.png',root));
    equal(image.toString('ascii',1,4),'PNG');
    const width=image.readUInt32BE(16);
    const height=image.readUInt32BE(20);
    const heroTag=read('index.html').match(/<img class="hero-art"[^>]+>/)?.[0] || '';
    equal(width >= 1500,true);
    equal(width / height >= 2.2,true);
    equal(image.byteLength > 250000,true);
    equal(heroTag.includes(`width="${width}"`),true);
    equal(heroTag.includes(`height="${height}"`),true);
    equal(/img\s*\{[^}]*height:auto;/s.test(read('assets/site.css')),true);
});

test('the repository and site credit vanilla-test with local artwork',()=>{
    const image=fs.readFileSync(new URL('assets/vanilla-test-header.png',root));
    const readme=read('README.md');
    const testingPage=read('testing/index.html');
    equal(image.toString('ascii',1,4),'PNG');
    equal(image.readUInt32BE(16) / image.readUInt32BE(20) >= 2.2,true);
    equal(readme.includes('Tested with [vanilla-test]'),true);
    equal(readme.includes('./assets/vanilla-test-header.png'),true);
    equal(testingPage.includes('Tested with vanilla-test.'),true);
    equal(testingPage.includes('../assets/vanilla-test-header.png'),true);
});

test('vanilla-test, coverage, package checks, and Pages deployment are wired',()=>{
    const packageData=JSON.parse(read('package.json'));
    const ciWorkflow=read('.github/workflows/ci.yml');
    const pagesWorkflow=read('.github/workflows/pages.yml');
    const playgroundPage=read('playground/index.html');
    const playgroundSource=read('assets/playground.js');
    equal(packageData.devDependencies['vanilla-test'],'2.1.1');
    equal(packageData.scripts['test:playground'],'node ./scripts/test.js playground');
    equal(packageData.scripts.coverage,'vanilla-test coverage');
    equal(read('test/harness.js').includes("import('vanilla-test')"),true);
    equal(playgroundPage.includes('<script type="module" src="../assets/playground.js"></script>'),true);
    equal(playgroundPage.includes('data-playground-code'),true);
    equal(playgroundSource.startsWith("import Queue from '../queue.js';"),true);
    equal(/\beval\s*\(|new\s+Function\b|\.innerHTML\s*=|set(?:Timeout|Interval)\s*\(/.test(playgroundSource),false);
    equal(ciWorkflow.includes('npm run coverage'),true);
    equal(ciWorkflow.includes("VANILLA_TEST_CHROME_NO_SANDBOX: '1'"),true);
    equal(ciWorkflow.includes('NODE_ENV: production'),true);
    equal(ciWorkflow.includes('npm install --ignore-scripts --no-audit --no-fund --package-lock=false'),true);
    equal(pagesWorkflow.includes('workflow_run:'),true);
    equal(pagesWorkflow.includes("github.event.workflow_run.conclusion == 'success'"),true);
    equal(pagesWorkflow.includes('actions/deploy-pages'),true);
    equal(pagesWorkflow.includes('cp playground/index.html _site/playground/'),true);
    equal(pagesWorkflow.includes('_site/assets/playground.js'),true);
    equal(pagesWorkflow.includes('_site/assets/vanilla-test-header.png'),true);
    equal(pagesWorkflow.includes('_site/reports/node/index.html'),true);
    equal(pagesWorkflow.includes('_site/reports/chrome/index.html'),true);
    equal(pagesWorkflow.includes("VANILLA_TEST_CHROME_NO_SANDBOX: '1'"),true);
    for(const pageName of pageNames){
        equal(pagesWorkflow.includes(pageName.split('/')[0]),true,`Pages workflow omits ${pageName}.`);
    }
});

test('the project remains JavaScript-only',()=>{
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
