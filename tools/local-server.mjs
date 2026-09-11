import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PORT=Number(process.env.PORT||process.argv[2]||4173);
const HOST='127.0.0.1';
const BASE_PATH=normalizeBasePath(process.env.BASE_PATH||'');
const mime={
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon',
  '.md':'text/markdown; charset=utf-8','.txt':'text/plain; charset=utf-8'
};
function normalizeBasePath(value){
  if(!value)return '';
  if(!/^\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*$/.test(value))throw new Error(`BASE_PATH must be an absolute URL path without a trailing slash: ${value}`);
  return value;
}
function resolveRequest(urlValue){
  const pathname=decodeURIComponent(new URL(urlValue,'http://local').pathname);
  const projectPath=BASE_PATH
    ?pathname===BASE_PATH?'/' : pathname.startsWith(`${BASE_PATH}/`)?pathname.slice(BASE_PATH.length):null
    :pathname;
  if(projectPath===null)return null;
  const relative=projectPath==='/'?'index.html':projectPath.replace(/^\/+/, '');
  const target=path.resolve(ROOT,relative);
  if(target!==ROOT && !target.startsWith(ROOT+path.sep))return null;
  return target;
}
const server=http.createServer((req,res)=>{
  const target=resolveRequest(req.url||'/');
  if(!target){res.writeHead(403);res.end('Forbidden');return;}
  fs.stat(target,(error,stat)=>{
    let file=target;
    if(!error && stat.isDirectory())file=path.join(target,'index.html');
    fs.readFile(file,(readError,data)=>{
      if(readError){res.writeHead(readError.code==='ENOENT'?404:500,{'Content-Type':'text/plain; charset=utf-8'});res.end(readError.code==='ENOENT'?'Not Found':'Server Error');return;}
      res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store, no-cache, must-revalidate','Pragma':'no-cache'});
      res.end(data);
    });
  });
});
function openBrowser(url){
  if(process.env.NO_BROWSER==='1')return;
  try{
    if(process.platform==='win32')spawn('cmd',['/c','start','',url],{detached:true,stdio:'ignore'}).unref();
    else if(process.platform==='darwin')spawn('open',[url],{detached:true,stdio:'ignore'}).unref();
    else spawn('xdg-open',[url],{detached:true,stdio:'ignore'}).unref();
  }catch{}
}
server.listen(PORT,HOST,()=>{
  const url=`http://${HOST}:${PORT}${BASE_PATH||''}/`;
  console.log(`\nDigilians E-Learn local server: ${url}`);
  console.log('Press Ctrl+C to stop.\n');
  openBrowser(url);
});
