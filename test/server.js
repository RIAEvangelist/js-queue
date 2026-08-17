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

test('resolves valid site paths inside the canonical root',()=>{
    equal(resolveRequest('/').endsWith('js-queue'),true);
    equal(resolveRequest('/guide/').endsWith('guide'),true);
    equal(resolveRequest('/playground/').endsWith('playground'),true);
    equal(resolveRequest('/%2e%2e%2foutside.txt'),null);
});

test('serves pages, modules, and generated images with correct types',async()=>{
    const server=createSiteServer();
    const port=await listen(server);

    try{
        const home=await request(port,'/');
        const guide=await request(port,'/guide/');
        const playground=await request(port,'/playground/');
        const module=await request(port,'/queue.js');
        const playgroundModule=await request(port,'/assets/playground.js');
        const image=await request(port,'/assets/js-queue-header.png');

        equal(home.status,200);
        equal(home.headers['content-type'],'text/html; charset=utf-8');
        equal(home.body.includes(Buffer.from('<title>js-queue')),true);
        equal(guide.status,200);
        equal(playground.status,200);
        equal(playground.headers['content-type'],'text/html; charset=utf-8');
        equal(playground.body.includes(Buffer.from('data-playground-code')),true);
        equal(module.headers['content-type'],'text/javascript; charset=utf-8');
        equal(playgroundModule.status,200);
        equal(playgroundModule.headers['content-type'],'text/javascript; charset=utf-8');
        equal(playgroundModule.body.includes(Buffer.from('function createPlayground()')),true);
        equal(image.headers['content-type'],'image/png');
        equal(image.body.byteLength > 250000,true);
    }finally{
        await close(server);
    }
});

test('rejects traversal and malformed paths while returning 404 for missing files',async()=>{
    const server=createSiteServer();
    const port=await listen(server);

    try{
        equal((await request(port,'/%2e%2e%2foutside.txt')).status,403);
        equal((await request(port,'/%E0%A4%A')).status,400);
        equal((await request(port,'/not-here')).status,404);
    }finally{
        await close(server);
    }
});

await run();
