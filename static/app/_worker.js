/* STOMAS Fællesskab – Cloudflare Pages Advanced Mode Worker, 2026-11.
   A restricted, moderated community beta; all member posts require moderation.
   Only deployed as part of the static/app Pages output directory.
*/
const CATEGORIES = ["Hverdagen", "Tale og udstyr", "Nyopereret", "Motion og fritid", "Medrørende", "Forslag til STOMAS"];
const SESSION_COOKIE = '__Host-stomas_forum';
const SESSION_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;
const encoder = new TextEncoder();
const now = () => Date.now();
const iso = () => new Date().toISOString();
const random = (count = 32) => crypto.getRandomValues(new Uint8Array(count));
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
const unb64 = text => Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4-text.length%4)%4)), c => c.charCodeAt(0));
const digest = async value => b64(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
async function pbkdf(password, salt) {
 const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
 return b64(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:unb64(salt),iterations:150000},key,256));
}
function constantEqual(a,b) {if(typeof a!=='string'||typeof b!=='string') return false;let n=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)n|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return n===0;}
function api(data,status=200,extra={}) {return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',...extra}});}
const err=(message,status=400)=>api({error:message},status);
function validEmail(email){return typeof email==='string'&&email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);}
function nameClean(name){return String(name||'').trim().replace(/\s+/g,' ');}
const validName = n => n.length>=2 && n.length<=32 && !/[<>\r\n]/.test(n);
const validPassword = p => typeof p==='string' && p.length>=12 && p.length<=128;
function cookieValue(req){ const c=req.headers.get('Cookie')||'';const m=c.match(/(?:^|;\s*)__Host-stomas_forum=([^;]+)/);return m?.[1]||'';}
async function viewer(env,req){const token=cookieValue(req);if(!/^[A-Za-z0-9_-]{40,50}$/.test(token))return null;const hash=await digest(token);const user=await env.FORUM_DB.prepare('SELECT u.id,u.nickname,u.email,u.role,u.banned FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(hash,now()).first();return user&&!user.banned?user:null;}
function publicUser(u){if(!u)return null;return {id:u.id,nickname:u.nickname,role:u.role};}
async function jsonBody(req,max=12000){ if(!((req.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json')))throw Error('TYPE');const text=await req.text();if(text.length>max)throw Error('SIZE');const data=JSON.parse(text);if(!data||Array.isArray(data)||typeof data!=='object')throw Error('BODY');return data; }
async function limited(env,req,action,limit=6,window=600000){
 const ip=req.headers.get('CF-Connecting-IP')||'local';
 const k=await digest((env.FORUM_RATE_SECRET||'forum')+'|'+action+'|'+ip);
 const start=now(),old=start-window;
 await env.FORUM_DB.prepare('INSERT INTO rate_limits(key_hash,window_start,attempts) VALUES(?,?,1) ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END, window_start=CASE WHEN window_start<? THEN ? ELSE window_start END').bind(k,start,old,old,start).run();
 const r=await env.FORUM_DB.prepare('SELECT attempts FROM rate_limits WHERE key_hash=?').bind(k).first();return (r?.attempts||0)<=limit;
}
const requiredUser=(u)=>u?null:err('Log ind for at fortsætte.',401);
const requiredAdmin=(u)=>u?.role==='admin'?null:err('Du har ikke adgang til moderation.',403);
async function session(env,u){const token=b64(random(32));await env.FORUM_DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(await digest(token),u.id,now(),now()+SESSION_LIFETIME_MS).run();return token;}
const cookie = token => `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_LIFETIME_MS/1000}; HttpOnly; Secure; SameSite=Strict`;
const endCookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
function metaThread(row){return {id:row.id,category:row.category,title:row.title,body:row.body,author:row.nickname,authorId:row.author_id,status:row.status,createdAt:row.created_at,updatedAt:row.updated_at,replies:Number(row.reply_count||0)};}
async function routes(req, env, path){
 const method=req.method;
 if(!env.FORUM_DB)return err('Forummet er ved at blive klargjort. Prøv senere.',503);
 if(method!=='GET'&&method!=='HEAD'){
   const origin=req.headers.get('Origin');const myOrigin=new URL(req.url).origin;
   if(origin!==myOrigin)return err('Anmodningen blev afvist af sikkerhedshensyn.',403);
 }
 const u=await viewer(env,req);
 if(method==='GET'&&path==='/api/forum'){
   const owner=await env.FORUM_DB.prepare('SELECT 1 AS ok FROM users WHERE role=\'admin\' LIMIT 1').first();
   const stats=await env.FORUM_DB.prepare('SELECT COUNT(*) AS total FROM threads WHERE status=\'approved\'').first();
   return api({ok:true,setupRequired:!owner,mode:'invite-only',moderated:true,categories:CATEGORIES,threads:stats?.total||0,viewer:publicUser(u)});
 }
 if(method==='GET'&&path==='/api/forum/me')return api({viewer:publicUser(u)});
 if(method==='POST'&&path==='/api/forum/setup'){
   if(!await limited(env,req,'setup',5,3600000))return err('For mange forsøg. Prøv igen senere.',429);
   const admin=await env.FORUM_DB.prepare('SELECT 1 AS ok FROM users WHERE role=\'admin\' LIMIT 1').first();if(admin)return err('Ejerkontoen er allerede oprettet.',403);
   const b=await jsonBody(req);const email=String(b.email||'').toLowerCase().trim(),nickname=nameClean(b.nickname);
   if(!validEmail(email)||!validName(nickname)||!validPassword(b.password))return err('Angiv gyldig e-mail, visningsnavn og adgangskode på mindst 12 tegn.');
   if(!env.FORUM_SETUP_TOKEN || !constantEqual(await digest(String(b.setupCode||'')),await digest(env.FORUM_SETUP_TOKEN)))return err('Forkert oprettelseskode.',403);
   const id=crypto.randomUUID(),salt=b64(random(16)),hash=await pbkdf(b.password,salt);
   try{await env.FORUM_DB.prepare('INSERT INTO users(id,email,nickname,role,pass_salt,pass_hash,created_at) VALUES(?,?,?,\'admin\',?,?,?)').bind(id,email,nickname,salt,hash,iso()).run();}
   catch(_){return err('Ejerkontoen er allerede oprettet eller e-mailen er i brug.',409);}
   return api({ok:true,viewer:{id,nickname,role:'admin'}},201,{'Set-Cookie':cookie(await session(env,{id}))});
 }
 if(method==='POST'&&path==='/api/forum/register'){
   if(!await limited(env,req,'register',5,3600000))return err('For mange forsøg. Prøv igen senere.',429);
   const b=await jsonBody(req),email=String(b.email||'').toLowerCase().trim(),nickname=nameClean(b.nickname),inv=String(b.invite||'').trim(),pass=b.password;
   if(!validEmail(email)||!validName(nickname)||!validPassword(pass)||inv.length<20 || b.adultConsent!==true || b.privacyConsent!==true)return err('Udfyld alle felter, og bekræft at du er voksen og accepterer reglerne.');
   const invHash=await digest(inv),registered=now();const invitation=await env.FORUM_DB.prepare('SELECT token_hash FROM invites WHERE token_hash=? AND redeemed_by IS NULL AND expires_at>?').bind(invHash,registered).first();if(!invitation)return err('Invitationskoden er ugyldig eller allerede brugt.',403);
   const id=crypto.randomUUID(),salt=b64(random(16)),hash=await pbkdf(pass,salt);
   try{await env.FORUM_DB.batch([
      env.FORUM_DB.prepare('INSERT INTO users(id,email,nickname,role,pass_salt,pass_hash,created_at) VALUES(?,?,?,\'member\',?,?,?)').bind(id,email,nickname,salt,hash,iso()),
      env.FORUM_DB.prepare('UPDATE invites SET redeemed_by=? WHERE token_hash=? AND redeemed_by IS NULL').bind(id,invHash)
   ]);}catch(_){return err('E-mailen er i brug, eller invitationskoden er anvendt.',409);}
   return api({ok:true,viewer:{id,nickname,role:'member'}},201,{'Set-Cookie':cookie(await session(env,{id}))});
 }
 if(method==='POST'&&path==='/api/forum/login'){
   if(!await limited(env,req,'login',8,600000))return err('For mange loginforsøg. Prøv igen senere.',429);
   const b=await jsonBody(req);const email=String(b.email||'').toLowerCase().trim();const user=validEmail(email)?await env.FORUM_DB.prepare('SELECT * FROM users WHERE email=?').bind(email).first():null;
   if(!user||user.banned||typeof b.password!=='string'||!constantEqual(await pbkdf(b.password,user.pass_salt),user.pass_hash))return err('Ugyldig e-mail eller adgangskode.',401);
   return api({ok:true,viewer:publicUser(user)},200,{'Set-Cookie':cookie(await session(env,user))});
 }
 if(method==='POST'&&path==='/api/forum/logout'){
   const token=cookieValue(req);if(token)await env.FORUM_DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();
   return api({ok:true},200,{'Set-Cookie':endCookie});
 }
 if(method==='POST'&&path==='/api/forum/password'){
   if(requiredUser(u))return requiredUser(u);
   if(!await limited(env,req,'password',6,3600000))return err('For mange forsøg.',429);
   const b=await jsonBody(req);if(!validPassword(b.newPassword))return err('Den nye adgangskode skal være på 12–128 tegn.');
   const row=await env.FORUM_DB.prepare('SELECT pass_salt,pass_hash FROM users WHERE id=?').bind(u.id).first();
   if(typeof b.oldPassword!=='string'||!constantEqual(await pbkdf(b.oldPassword,row.pass_salt),row.pass_hash))return err('Den gamle adgangskode er forkert.',403);
   const salt=b64(random(16));await env.FORUM_DB.batch([
     env.FORUM_DB.prepare('UPDATE users SET pass_salt=?,pass_hash=? WHERE id=?').bind(salt,await pbkdf(b.newPassword,salt),u.id),
     env.FORUM_DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(u.id)
   ]);
   return api({ok:true,notice:'Adgangskoden er ændret. Log ind igen.'},200,{'Set-Cookie':endCookie});
 }
 if(method==='GET'&&path==='/api/forum/invites'){
   if(requiredAdmin(u))return requiredAdmin(u);
   const r=await env.FORUM_DB.prepare('SELECT created_at,expires_at,redeemed_by IS NOT NULL AS used FROM invites ORDER BY created_at DESC LIMIT 30').all();return api({invites:r.results||[]});
 }
 if(method==='POST'&&path==='/api/forum/invites'){
   if(requiredAdmin(u))return requiredAdmin(u);
   if(!await limited(env,req,'invite',15,3600000))return err('For mange invitationer.',429);
   const token=b64(random(24));await env.FORUM_DB.prepare('INSERT INTO invites(token_hash,created_by,created_at,expires_at) VALUES(?,?,?,?)').bind(await digest(token),u.id,now(),now()+14*86400000).run();
   return api({invite:token,expiresInDays:14},201);
 }
 if(method==='GET'&&path==='/api/forum/threads'){
   const url=new URL(req.url),category=url.searchParams.get('category')||'',q=(url.searchParams.get('q')||'').slice(0,80),offset=Math.min(200,Math.max(0,Number(url.searchParams.get('offset'))||0));
   const clause=u?.role==='admin'?'(t.status IN (\'approved\',\'pending\'))':u?'(t.status=\'approved\' OR t.author_id=?)':'t.status=\'approved\'';
   const bindings=u&&u.role!=='admin'?[u.id]:[];
   let sql=`SELECT t.id,t.category,t.title,t.body,t.author_id,t.status,t.created_at,t.updated_at,v.nickname,(SELECT COUNT(*) FROM replies r WHERE r.thread_id=t.id AND r.status='approved') AS reply_count FROM threads t JOIN users v ON v.id=t.author_id WHERE ${clause} AND v.banned=0`;
   if(category){if(!CATEGORIES.includes(category))return err('Ukendt kategori.');sql+=' AND t.category=?';bindings.push(category);}
   if(q){sql+=' AND (t.title LIKE ? OR t.body LIKE ?)';bindings.push('%'+q+'%','%'+q+'%');}
   sql+=' ORDER BY t.created_at DESC LIMIT 21 OFFSET ?';bindings.push(offset);
   const result=await env.FORUM_DB.prepare(sql).bind(...bindings).all();return api({threads:(result.results||[]).slice(0,20).map(metaThread),hasMore:(result.results||[]).length>20});
 }
 if(method==='POST'&&path==='/api/forum/threads'){
   if(requiredUser(u))return requiredUser(u);
   if(!await limited(env,req,'thread',4,3600000))return err('Du har nået grænsen for indlæg. Prøv senere.',429);
   const b=await jsonBody(req),title=String(b.title||'').trim(),body=String(b.body||'').trim(),cat=String(b.category||'');
   if(!CATEGORIES.includes(cat)||title.length<5||title.length>110||body.length<15||body.length>2500)return err('Vælg en kategori, en overskrift (5–110 tegn) og en tekst (15–2500 tegn).');
   const id=crypto.randomUUID();await env.FORUM_DB.prepare('INSERT INTO threads(id,category,title,body,author_id,status,created_at,updated_at) VALUES(?,?,?,?,?,\'pending\',?,?)').bind(id,cat,title,body,u.id,iso(),iso()).run();return api({ok:true,id,status:'pending',message:'Dit indlæg afventer moderation.'},201);
 }
 const threadMatch=path.match(/^\/api\/forum\/threads\/([a-f0-9-]{36})$/);
 if(method==='GET'&&threadMatch){
   const id=threadMatch[1];const t=await env.FORUM_DB.prepare('SELECT t.*,v.nickname,v.banned FROM threads t JOIN users v ON v.id=t.author_id WHERE t.id=?').bind(id).first();
   if(!t||t.banned||!(t.status==='approved'||u&&(u.role==='admin'||u.id===t.author_id)))return err('Tråden findes ikke.',404);
   const viewAll=u?.role==='admin';const own=u?.id||'';
   const result=await env.FORUM_DB.prepare("SELECT r.id,r.author_id,r.body,r.status,r.created_at,v.nickname FROM replies r JOIN users v ON v.id=r.author_id WHERE r.thread_id=? AND v.banned=0 AND (r.status='approved' OR r.author_id=? OR ?=1) ORDER BY r.created_at LIMIT 150").bind(id,own,viewAll?1:0).all();
   return api({thread:metaThread(t),replies:(result.results||[]).map(r=>({id:r.id,body:r.body,author:r.nickname,authorId:r.author_id,status:r.status,createdAt:r.created_at}))});
 }
 if(method==='POST'&&/^\/api\/forum\/threads\/[a-f0-9-]{36}\/replies$/.test(path)){
   if(requiredUser(u))return requiredUser(u);
   if(!await limited(env,req,'reply',12,3600000))return err('For mange svar. Prøv senere.',429);
   const threadId=path.split('/')[4];const t=await env.FORUM_DB.prepare('SELECT status FROM threads WHERE id=?').bind(threadId).first();if(!t||t.status!=='approved')return err('Du kan kun svare i godkendte tråde.',403);
   const b=await jsonBody(req),body=String(b.body||'').trim();if(body.length<2||body.length>1500)return err('Skriv et svar på 2–1500 tegn.');
   const id=crypto.randomUUID();await env.FORUM_DB.prepare("INSERT INTO replies(id,thread_id,author_id,body,status,created_at) VALUES(?,?,?,?,'pending',?)").bind(id,threadId,u.id,body,iso()).run();return api({ok:true,id,status:'pending',message:'Dit svar afventer moderation.'},201);
 }
 if(method==='POST'&&path==='/api/forum/reports'){
   if(requiredUser(u))return requiredUser(u);
   if(!await limited(env,req,'report',12,3600000))return err('For mange anmeldelser.',429);
   const b=await jsonBody(req),kind=b.type,id=b.id,reason=String(b.reason||'').trim();
   if(!['thread','reply'].includes(kind)||!/^[0-9a-f-]{36}$/.test(id)||reason.length<8||reason.length>600)return err('Skriv en begrundelse på 8–600 tegn.');
   const table=kind==='thread'?'threads':'replies',row=await env.FORUM_DB.prepare(`SELECT id FROM ${table} WHERE id=? AND status='approved'`).bind(id).first();if(!row)return err('Indholdet findes ikke.',404);
   try{await env.FORUM_DB.prepare('INSERT INTO reports(id,target_type,target_id,reason,reporter_id,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),kind,id,reason,u.id,iso()).run();}catch(_){return err('Du har allerede anmeldt dette indhold.',409);}
   return api({ok:true,message:'Tak. Anmeldelsen er sendt til moderation.'},201);
 }
 if(method==='GET'&&path==='/api/forum/moderation'){
   if(requiredAdmin(u))return requiredAdmin(u);
   const [threads,replies,reports]=await Promise.all([
     env.FORUM_DB.prepare("SELECT t.id,t.category,t.title,t.body,t.created_at,v.nickname FROM threads t JOIN users v ON v.id=t.author_id WHERE t.status='pending' ORDER BY t.created_at LIMIT 100").all(),
     env.FORUM_DB.prepare("SELECT r.id,r.body,r.created_at,v.nickname,t.title AS thread_title FROM replies r JOIN users v ON v.id=r.author_id JOIN threads t ON t.id=r.thread_id WHERE r.status='pending' ORDER BY r.created_at LIMIT 100").all(),
     env.FORUM_DB.prepare("SELECT a.id,a.target_type,a.target_id,a.reason,a.created_at,v.nickname FROM reports a JOIN users v ON v.id=a.reporter_id WHERE a.status='open' ORDER BY a.created_at LIMIT 100").all()
   ]);return api({threads:threads.results||[],replies:replies.results||[],reports:reports.results||[]});
 }
 if(method==='POST'&&path==='/api/forum/moderation'){
   if(requiredAdmin(u))return requiredAdmin(u);
   const b=await jsonBody(req),kind=b.type,action=b.action,id=b.id;
   if(!['thread','reply','report'].includes(kind)||!['approve','reject','close'].includes(action)||!/^[0-9a-f-]{36}$/.test(id))return err('Ugyldig handling.');
   if(kind==='report'){
     if(action!=='close')return err('Anmeldelser kan kun lukkes.');
     await env.FORUM_DB.prepare("UPDATE reports SET status='closed' WHERE id=?").bind(id).run();
   }else{
     if(action==='close')return err('Ugyldig handling.');
     await env.FORUM_DB.prepare(`UPDATE ${kind==='thread'?'threads':'replies'} SET status=? WHERE id=?`).bind(action==='approve'?'approved':'rejected',id).run();
   }
   return api({ok:true});
 }
 if(method==='GET'&&path==='/api/forum/export'){
   if(requiredUser(u))return requiredUser(u);
   const [t,r]=await Promise.all([env.FORUM_DB.prepare('SELECT category,title,body,status,created_at FROM threads WHERE author_id=?').bind(u.id).all(),env.FORUM_DB.prepare('SELECT thread_id,body,status,created_at FROM replies WHERE author_id=?').bind(u.id).all()]);
   return api({profile:{email:u.email,nickname:u.nickname,role:u.role},threads:t.results||[],replies:r.results||[]});
 }
 if(method==='POST'&&path==='/api/forum/delete-account'){
   if(requiredUser(u))return requiredUser(u);
   if(u.role==='admin')return err('Ejerkontoen kan ikke slettes fra betaforummet. Kontakt administratoren.',403);
   if(!await limited(env,req,'delete',5,3600000))return err('For mange forsøg.',429);
   const b=await jsonBody(req),row=await env.FORUM_DB.prepare('SELECT pass_salt,pass_hash FROM users WHERE id=?').bind(u.id).first();
   if(typeof b.password!=='string'||!constantEqual(await pbkdf(b.password,row.pass_salt),row.pass_hash))return err('Forkert adgangskode.',403);
   await env.FORUM_DB.prepare('DELETE FROM users WHERE id=?').bind(u.id).run();return api({ok:true},200,{'Set-Cookie':endCookie});
 }
 return err('Ukendt forumfunktion.',404);
}
export default {
 async fetch(request,env){const url=new URL(request.url);if(!url.pathname.startsWith('/api/forum'))return env.ASSETS.fetch(request);
   if(!['GET','POST'].includes(request.method))return err('Metoden er ikke tilladt.',405);
   try {return await routes(request,env,url.pathname.replace(/\/$/,'')||'/');}
   catch(e) {if(['TYPE','SIZE','BODY','SyntaxError'].includes(e?.message)||e instanceof SyntaxError)return err('Ugyldigt indhold i anmodningen.'); console.error('Forum API:',String(e?.message||e));return err('Der opstod en serverfejl. Prøv igen senere.',500);}
 }
};