import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const BASE_PATH='/Digilians-E-learn-platform';

async function freePort(){
  const probe=http.createServer();
  probe.listen(0,'127.0.0.1');
  await once(probe,'listening');
  const {port}=probe.address();
  await new Promise(resolve=>probe.close(resolve));
  return port;
}

function request(port,pathname){
  return new Promise((resolve,reject)=>{
    const req=http.get({host:'127.0.0.1',port,path:pathname},res=>{
      let body='';
      res.setEncoding('utf8');
      res.on('data',chunk=>{body+=chunk;});
      res.on('end',()=>resolve({status:res.statusCode,body}));
    });
    req.on('error',reject);
  });
}

async function startServer(basePath=''){
  const port=await freePort();
  const server=spawn(process.execPath,['tools/local-server.mjs'],{
    cwd:new URL('../',import.meta.url),
    env:{...process.env,PORT:String(port),NO_BROWSER:'1',...(basePath?{BASE_PATH:basePath}:{})},
    stdio:['ignore','pipe','pipe']
  });
  let output='';
  server.stdout.on('data',chunk=>{output+=chunk;});
  server.stderr.on('data',chunk=>{output+=chunk;});
  await Promise.race([
    once(server.stdout,'data'),
    once(server,'exit').then(([code])=>Promise.reject(new Error(`local server exited ${code}: ${output}`)))
  ]);
  return {port,server};
}

test('local server serves GitHub Pages project-subpath runtime smoke paths',async t=>{
  const {port,server}=await startServer(BASE_PATH);
  t.after(async()=>{
    if(!server.killed){server.kill('SIGTERM');await once(server,'exit');}
  });
  const paths=[
    `${BASE_PATH}/`,`${BASE_PATH}/index.html`,`${BASE_PATH}/VERSION.txt`,
    `${BASE_PATH}/assets/js/analytics.js?v=0.22.8`,
    `${BASE_PATH}/assets/js/update-manager.js?v=0.22.8`,
    `${BASE_PATH}/assets/js/backup-restore.js?v=0.22.8`,
    `${BASE_PATH}/assets/js/app.js?v=0.22.8`,
    `${BASE_PATH}/assets/js/avatar-profile.js?v=0.22.8`,
    `${BASE_PATH}/assets/js/build-version.js?v=0.22.8`,
    `${BASE_PATH}/assets/js/exam.js?v=0.22.8`,
    `${BASE_PATH}/assets/js/exam-answers.js?v=0.22.8`,
    `${BASE_PATH}/assets/js/exam-engine.js?v=0.22.8`,
    `${BASE_PATH}/assets/js/exam-session.js?v=0.22.8`,
    `${BASE_PATH}/assets/js/exam-timer.js?v=0.22.8`,
    `${BASE_PATH}/assets/js/excel-study-render.js?v=0.22.8`,
    `${BASE_PATH}/assets/js/python-study-render.js?v=0.22.8`,
    `${BASE_PATH}/assets/js/sql-study-render.js?v=0.22.8`,
    `${BASE_PATH}/voucher/tracks/data-analysis/microsoft-pl-300/full-ranked-index.json?v=0.22.8`
  ];
  const responses=await Promise.all(paths.map(pathname=>request(port,pathname)));
  for(let index=0;index<paths.length;index++)assert.equal(responses[index].status,200,`${paths[index]} must return HTTP 200`);
  assert.equal(responses[2].body.trim(),'0.22.8');
  assert.match(responses[1].body,/data-build-version="0\.22\.8"/);
});

test('local server retains its default root mount when BASE_PATH is unset',async t=>{
  const {port,server}=await startServer();
  t.after(async()=>{
    if(!server.killed){server.kill('SIGTERM');await once(server,'exit');}
  });
  const response=await request(port,'/index.html');
  assert.equal(response.status,200);
  assert.match(response.body,/data-build-version="0\.22\.8"/);
});
