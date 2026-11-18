require('dotenv').config();
const express=require('express'),session=require('express-session'),multer=require('multer'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const app=express(),ROOT=__dirname,FILE=path.join(ROOT,'data','content.json');
const SUPABASE_URL=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const SUPABASE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;
const REMOTE=!!(SUPABASE_URL&&SUPABASE_KEY);
const BUCKET=process.env.SUPABASE_STORAGE_BUCKET||'portfolio-images';
const remoteHeaders=()=>({'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`});
async function remoteRequest(url,options={}){const r=await fetch(SUPABASE_URL+url,{...options,headers:{...remoteHeaders(),...(options.headers||{})}});if(!r.ok)throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0,250)}`);if(r.status===204)return null;return r.json()}

const password=process.env.ADMIN_PASSWORD,secret=process.env.SESSION_SECRET;
if(!password||password==='BURAYA_GUCLU_BIR_SIFRE_YAZ'||!secret||secret==='BURAYA_UZUN_RASTGELE_BIR_GIZLI_ANAHTAR_YAZ'){console.error('Önce .env dosyasında ADMIN_PASSWORD ve SESSION_SECRET tanımlayın.');process.exit(1)}
app.disable('x-powered-by');app.set('trust proxy',process.env.NODE_ENV==='production'?1:false);
app.use(express.json({limit:'300kb'}));app.use(express.urlencoded({extended:false}));
app.use(session({name:'portfolio.sid',secret,resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:1000*60*60*4}}));
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');next()});
async function read(){
 if(!REMOTE)return JSON.parse(fs.readFileSync(FILE,'utf8'));
 const rows=await remoteRequest('/rest/v1/portfolio_content?id=eq.1&select=data');
 if(!rows.length)throw new Error('Supabase portfolio_content tablosunda id=1 kaydı bulunamadı. Kurulum SQL dosyasını çalıştırın.');
 return rows[0].data;
}
async function save(data){
 if(!REMOTE){const tmp=FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data,null,2));fs.renameSync(tmp,FILE);return}
 await remoteRequest('/rest/v1/portfolio_content?id=eq.1',{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({data})});
}
function asyncRoute(fn){return(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next)}

function auth(req,res,next){if(req.session.admin)return next();res.status(401).json({error:'Oturum açmalısınız.'})}
function sameOrigin(req,res,next){const origin=req.get('origin');if(origin&&origin!==`${req.protocol}://${req.get('host')}`)return res.status(403).json({error:'Origin doğrulanamadı'});next()}
function clean(s,n=3000){return String(s??'').slice(0,n).trim()}
const attempts=new Map();
app.post('/api/login',sameOrigin,(req,res)=>{const ip=req.ip,record=attempts.get(ip)||{n:0,until:0};if(record.until>Date.now())return res.status(429).json({error:'Biraz bekleyip tekrar deneyin.'});const a=Buffer.from(crypto.createHash('sha256').update(clean(req.body.password,200)).digest()),b=Buffer.from(crypto.createHash('sha256').update(password).digest());if(!crypto.timingSafeEqual(a,b)){record.n++;if(record.n>=6){record.until=Date.now()+15*60*1000;record.n=0}attempts.set(ip,record);return res.status(401).json({error:'Şifre hatalı.'})}attempts.delete(ip);req.session.regenerate(e=>{if(e)return res.status(500).end();req.session.admin=true;res.json({ok:true})})});
app.post('/api/logout',sameOrigin,(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/session',(req,res)=>res.json({admin:!!req.session.admin}));
app.get('/api/content',asyncRoute(async(req,res)=>{const {messages,...publicData}=await read();res.json(publicData)}));
app.get('/api/admin/content',auth,asyncRoute(async(req,res)=>res.json(await read())));
app.put('/api/admin/content',sameOrigin,auth,asyncRoute(async(req,res)=>{const incoming=req.body;const current=await read();if(!incoming||typeof incoming!=='object'||Array.isArray(incoming))return res.status(400).json({error:'Geçersiz veri'});for(const key of ['profile','projects','gallery','posts']){if(!(key in incoming))continue;if(key==='profile'){if(!incoming.profile||typeof incoming.profile!=='object'||Array.isArray(incoming.profile))return res.status(400).json({error:'Profil hatalı'});current.profile={...current.profile,...Object.fromEntries(Object.entries(incoming.profile).filter(([k,v])=>k in current.profile&&typeof v==='string').map(([k,v])=>[k,clean(v,2000)]))}}else{if(!Array.isArray(incoming[key])||incoming[key].length>100)return res.status(400).json({error:'Liste hatalı'});const fields=key==='posts'?['id','title_tr','title_en','excerpt_tr','excerpt_en','body_tr','body_en','category_tr','category_en','tags','image']:key==='projects'?['id','title_tr','title_en','description_tr','description_en','category','image']:['id','title_tr','title_en','description_tr','description_en','image'];current[key]=incoming[key].filter(x=>x&&typeof x==='object').map(x=>Object.fromEntries(fields.map(f=>[f,clean(x[f],f.startsWith('body')?12000:2000)])))}}await save(current);res.json({ok:true})}));
app.get('/api/admin/messages',auth,asyncRoute(async(req,res)=>res.json((await read()).messages||[])));
app.post('/api/contact',sameOrigin,asyncRoute(async(req,res)=>{const {name,email,message}=req.body;if(!clean(name,100)||!/^\S+@\S+\.\S+$/.test(clean(email,150))||clean(message,3000).length<5)return res.status(400).json({error:'Bilgileri kontrol edin.'});const d=await read();d.messages=d.messages||[];d.messages.unshift({id:crypto.randomUUID(),name:clean(name,100),email:clean(email,150),message:clean(message,3000),date:new Date().toISOString()});d.messages=d.messages.slice(0,500);await save(d);res.json({ok:true})}));
const uploadDir=path.join(ROOT,'uploads');
if(!REMOTE)fs.mkdirSync(uploadDir,{recursive:true});
const storage=REMOTE?multer.memoryStorage():multer.diskStorage({destination:uploadDir,filename:(req,file,cb)=>cb(null,crypto.randomUUID()+({'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif'}[file.mimetype]||'.bin'))});
const upload=multer({storage,limits:{fileSize:4*1024*1024},fileFilter:(req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype))});
app.post('/api/admin/upload',sameOrigin,auth,upload.single('image'),asyncRoute(async(req,res)=>{
 if(!req.file)return res.status(400).json({error:'JPG, PNG, WEBP veya GIF seçin.'});
 const sig=REMOTE?req.file.buffer.subarray(0,12):fs.readFileSync(req.file.path).subarray(0,12);
 const valid=sig.subarray(0,3).toString('hex')==='ffd8ff'||sig.subarray(0,8).toString('hex')==='89504e470d0a1a0a'||(sig.toString('ascii',0,4)==='RIFF'&&sig.toString('ascii',8,12)==='WEBP')||sig.toString('ascii',0,3)==='GIF';
 if(!valid){if(!REMOTE)fs.unlinkSync(req.file.path);return res.status(400).json({error:'Geçersiz görsel.'})}
 if(!REMOTE)return res.json({url:'/uploads/'+req.file.filename});
 const filename=crypto.randomUUID()+({'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif'}[req.file.mimetype]);
 const r=await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(BUCKET)}/${filename}`,{method:'POST',headers:{...remoteHeaders(),'Content-Type':req.file.mimetype,'x-upsert':'false'},body:req.file.buffer});
 if(!r.ok)throw new Error(`Supabase Storage ${r.status}: ${(await r.text()).slice(0,250)}`);
 res.json({url:`${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(BUCKET)}/${filename}`});
}));
app.use('/uploads',express.static(uploadDir,{index:false,maxAge:'1d'}));
const chats=new Map();app.post('/api/assistant',sameOrigin,asyncRoute(async(req,res)=>{const q=clean(req.body.message,500);if(!q)return res.status(400).json({error:'Soru boş.'});const key=req.ip,now=Date.now(),v=chats.get(key)||[];const recent=v.filter(t=>now-t<60000);if(recent.length>=12)return res.status(429).json({error:'Bir dakika sonra tekrar deneyin.'});recent.push(now);chats.set(key,recent);const p=(await read()).profile;const context=`Ad: ${p.name}\nEğitim: ${p.education_tr}\nHakkında: ${p.about_tr}\nYetenekler: ${p.skills_tr}\nİletişim: ${p.email||'Sitedeki iletişim formu'}`;const fallback=()=>{const l=q.toLocaleLowerCase('tr');if(/iletişim|mail|telefon|contact|reach/.test(l))return p.email?`İletişim e-postası: ${p.email}`:'İletişim sayfasındaki formu kullanabilirsin.';if(/eğitim|okul|üniversite|education|study/.test(l))return p.education_tr;if(/yetenek|skill|bilgi|program/.test(l))return p.skills_tr;if(/proje|project/.test(l))return 'Projeler sayfasında çalışmalarını inceleyebilirsin.';return `${p.name}: ${p.about_tr} Daha fazlası için Hakkımda ve Projeler sayfalarına göz atabilirsin.`};if(!process.env.GEMINI_API_KEY)return res.json({reply:fallback(),mode:'basic'});try{const model=process.env.GEMINI_MODEL||'gemini-2.5-flash';const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),12000);let r;try{r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({systemInstruction:{parts:[{text:`Sen Mustafa'nın kişisel portfolyo asistanısın. Yalnızca verilen bilgilerle cevapla; bilmediğini uydurma. Kısa, samimi ve kullanıcının dilinde yanıt ver.\n${context}`}]},contents:[{role:'user',parts:[{text:q}]}],generationConfig:{maxOutputTokens:250}}),signal:ctrl.signal})}finally{clearTimeout(timer)}if(!r.ok)throw Error('AI servis hatası');const j=await r.json();res.json({reply:clean(j.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join(' ')||fallback(),2000),mode:'ai'})}catch(e){res.json({reply:fallback(),mode:'basic'})}}));
app.use(express.static(path.join(ROOT,'public'),{extensions:['html']}));app.get('/',(req,res)=>res.sendFile(path.join(ROOT,'public','index.html')));
app.use((err,req,res,next)=>{console.error('Sunucu hatası:',err.message);res.status(err.code==='LIMIT_FILE_SIZE'?413:err.code?400:500).json({error:err.code==='LIMIT_FILE_SIZE'?'Görsel en fazla 4 MB olabilir.':err.code?'İstek işlenemedi.':'Sunucu hatası. Sunucu günlüklerini kontrol edin.'})});
app.listen(process.env.PORT||3000,()=>console.log(`Portfolio: http://localhost:${process.env.PORT||3000}`));
