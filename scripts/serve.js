import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const port=Number(process.env.PORT || process.argv[2] || 8000);
const host=process.env.HOST || '127.0.0.1';
const types=new Map([
    ['.css','text/css; charset=utf-8'],
    ['.html','text/html; charset=utf-8'],
    ['.js','text/javascript; charset=utf-8'],
    ['.json','application/json; charset=utf-8'],
    ['.md','text/markdown; charset=utf-8'],
    ['.png','image/png'],
    ['.svg','image/svg+xml; charset=utf-8']
]);

function resolveRequest(requestURL){
    const pathname=decodeURIComponent(new URL(requestURL,'http://localhost').pathname);
    const requested=path.resolve(root,`.${pathname}`);
    if(requested !== root && !requested.startsWith(`${root}${path.sep}`)){
        return null;
    }
    return requested;
}

function handleRequest(request,response){
    let requested;

    try{
        requested=resolveRequest(request.url || '/');
    }catch{
        response.writeHead(400);
        response.end('Bad request');
        return;
    }

    if(!requested){
        response.writeHead(403);
        response.end('Forbidden');
        return;
    }

    if(fs.existsSync(requested) && fs.statSync(requested).isDirectory()){
        requested=path.join(requested,'index.html');
    }

    if(!fs.existsSync(requested) || !fs.statSync(requested).isFile()){
        response.writeHead(404);
        response.end('Not found');
        return;
    }

    response.writeHead(200,{
        'Cache-Control':'no-store',
        'Content-Type':types.get(path.extname(requested).toLowerCase()) || 'application/octet-stream'
    });
    fs.createReadStream(requested).pipe(response);
}

function createSiteServer(){
    return http.createServer(handleRequest);
}

const entryPath=process.argv[1] ? path.resolve(process.argv[1]) : '';
if(entryPath === fileURLToPath(import.meta.url)){
    const server=createSiteServer();
    server.listen(port,host,()=>{
        console.log(`js-queue documentation: http://${host}:${port}/`);
    });
}

export {createSiteServer,resolveRequest};
