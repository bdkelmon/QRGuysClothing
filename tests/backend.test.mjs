import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {configuration,publicConfiguration}=require('../lib/backend.js');
const {createHandler:claim}=require('../api/associate-apparel-qr.js');
const {createHandler:resolve}=require('../api/resolve-apparel.js');
const env={QRG_SERVICES_READY:'true',QRG_APP_ORIGIN:'https://qrguysclothing.com',QRG_SUPABASE_URL:'https://new-project.supabase.co',QRG_SUPABASE_ANON_KEY:'test-public',QRG_SUPABASE_SERVICE_ROLE_KEY:'test-secret'};
async function invoke(handler, req={}) {
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 await handler({method:'POST',headers:{},...req},res);return res;
}
test('services default closed and never inherit legacy env',()=>{
 assert.throws(()=>configuration({SUPABASE_URL:'https://old.supabase.co'}),/not enabled/);
 assert.throws(()=>configuration({...env,QRG_APP_ORIGIN:'https://themeqr.com'}),/Independent/);
});
test('public config excludes secrets and keeps unimplemented features disabled',()=>{
 const result=publicConfiguration(configuration(env));
 assert.equal(JSON.stringify(result).includes('test-secret'),false);
 assert.deepEqual(result.features,{videoUpload:false,imageUpload:false,checkout:false});
});
test('claim requires bearer verification before RPC',async()=>{
 let called=false;
 const res=await invoke(claim({env,client:{rpc(){called=true;}}}));
 assert.equal(res.code,401);assert.equal(called,false);
});
test('public printed ID is not activation proof',async()=>{
 const res=await invoke(claim({env,client:{request:async()=>({id:'verified-user'}),rpc(){throw Error('unexpected');}}}),{headers:{authorization:'Bearer token'},body:{apparel_qr_id:'public-id'}});
 assert.equal(res.code,400);
});
test('claim uses verified identity and requires a returned record',async()=>{
 let params;
 const client={request:async()=>({id:'verified-user'}),rpc:async(name,p)=>{params=p;return [];}};
 const res=await invoke(claim({env,client}),{headers:{authorization:'Bearer token'},body:{user_id:'attacker',activation_code:'QRG-'+'A'.repeat(32)}});
 assert.equal(params.p_user_id,'verified-user');assert.equal(res.code,409);
});
test('foreign origin is rejected before contacting account service',async()=>{
 const res=await invoke(claim({env,client:{}}),{headers:{origin:'https://other.example'}});
 assert.equal(res.code,403);
});
test('resolver returns only allowed public display fields',async()=>{
 const row={content_type:'text',text_content:'Hello',activation_code:'secret',user_id:'private',buyer_email:'private@example.com',url:'javascript:alert(1)',settings:{apparel_background_color:'#000',secret:'hidden'}};
 const res=await invoke(resolve({env,client:{rpc:async()=>[row]}}),{method:'GET',query:{linkId:'public-id'}});
 assert.equal(res.code,200);assert.equal(res.body.url,null);
 assert.equal(JSON.stringify(res.body).includes('secret'),false);assert.equal(JSON.stringify(res.body).includes('private'),false);
});
