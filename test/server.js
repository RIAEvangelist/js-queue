import http from 'node:http';
import {createSiteServer,resolveRequest} from '../scripts/serve.js';
import {equal,run,test} from './harness.js';

function listen(server){
    return new Promise((resolve,reject)=>{
        server.once('error',reject);
        server.listen(0,'127.0.0.1',()=>resolve(server.address().port));
    });
}

function close(server){
    return new Promise((resolve,reject)=>server.close(error=>error ? reject(error) : resolve()));
}

function request(port,path){
    return new Promise((resolve,reject)=>{
        const outgoing=http.get({host:'127.0.0.1',port,path},response=>{
            const chunks=[];
            response.on('data',chunk=>chunks.push(chunk));
            response.on('end',()=>resolve({
                body:Buffer.concat(chunks),
                headers:response.headers,
                status:response.statusCode
            }));
        });
        outgoing.on('error',reject);
    });
}

async function withServer(check){
    const server=createSiteServer();
    const port=await listen(server);
    try{
        await check(port);
    }finally{
        await close(server);
    }
}

test('integration: server resolves the site root inside the canonical directory',()=>{
    equal(resolveRequest('/').endsWith('js-queue'),true);
});

test('integration: server resolves documentation route directories',()=>{
    equal(resolveRequest('/guide/').endsWith('guide'),true);
    equal(resolveRequest('/playground/').endsWith('playground'),true);
});

test('integration: server refuses encoded traversal outside the site root',()=>{
    equal(resolveRequest('/%2e%2e%2foutside.txt'),null);
});

test('integration: server returns HTML for overview and guide pages',async()=>{
    await withServer(async port=>{
        const home=await request(port,'/');
        const guide=await request(port,'/guide/');
        equal(home.status,200);
        equal(home.headers['content-type'],'text/html; charset=utf-8');
        equal(home.body.includes(Buffer.from('<title>js-queue')),true);
        equal(guide.status,200);
        equal(guide.headers['content-type'],'text/html; charset=utf-8');
    });
});

test('integration: server returns the playground page and code surface',async()=>{
    await withServer(async port=>{
        const playground=await request(port,'/playground/');
        equal(playground.status,200);
        equal(playground.headers['content-type'],'text/html; charset=utf-8');
        equal(playground.body.includes(Buffer.from('data-playground-code')),true);
    });
});

test('integration: server returns queue modules with JavaScript content types',async()=>{
    await withServer(async port=>{
        const queueModule=await request(port,'/queue.js');
        const stackModule=await request(port,'/stack.js');
        const easyStackModule=await request(port,'/node_modules/easy-stack/stack.js');
        const playgroundModule=await request(port,'/assets/playground.js');
        equal(queueModule.status,200);
        equal(queueModule.headers['content-type'],'text/javascript; charset=utf-8');
        equal(stackModule.status,200);
        equal(stackModule.headers['content-type'],'text/javascript; charset=utf-8');
        equal(stackModule.body.includes(Buffer.from("import Stack from 'easy-stack';")),true);
        equal(easyStackModule.status,200);
        equal(easyStackModule.headers['content-type'],'text/javascript; charset=utf-8');
        equal(playgroundModule.status,200);
        equal(playgroundModule.headers['content-type'],'text/javascript; charset=utf-8');
        equal(playgroundModule.body.includes(Buffer.from('function createPlayground()')),true);
    });
});

test('integration: server returns repository artwork with image content types',async()=>{
    await withServer(async port=>{
        const header=await request(port,'/assets/js-queue-header.png');
        const chart=await request(port,'/assets/benchmark-construct.svg');
        equal(header.status,200);
        equal(header.headers['content-type'],'image/png');
        equal(header.body.byteLength > 250000,true);
        equal(chart.status,200);
        equal(chart.headers['content-type'],'image/svg+xml; charset=utf-8');
        equal(chart.body.includes(Buffer.from('<svg')),true);
    });
});

test('integration: server distinguishes traversal and malformed URL failures',async()=>{
    await withServer(async port=>{
        equal((await request(port,'/%2e%2e%2foutside.txt')).status,403);
        equal((await request(port,'/%E0%A4%A')).status,400);
    });
});

test('integration: server returns 404 for a missing local target',async()=>{
    await withServer(async port=>{
        equal((await request(port,'/not-here')).status,404);
    });
});

await run();
