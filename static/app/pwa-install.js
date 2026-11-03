(()=>{
'use strict';
let promptEvent=null,banner=null,timer=null;
const key='stomas-install-snoozed-until',ua=navigator.userAgent||'';
const ios=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const mobile=ios||/Android|Mobile/i.test(ua);
const installed=()=>matchMedia('(display-mode:standalone)').matches||navigator.standalone===true;
function snoozed(){try{return Number(localStorage.getItem(key)||0)>Date.now()}catch(e){return false}}
function postpone(days){try{localStorage.setItem(key,String(Date.now()+days*86400000))}catch(e){}}
function close(){if(timer)clearTimeout(timer);if(banner)banner.remove();banner=null}
function help(){
 if(!banner)return;
 const guide=banner.querySelector('.install-guide');
 guide.textContent=ios?'Åbn STOMAS i Safari, tryk Del, vælg Føj til hjemmeskærm og tryk Tilføj.':/Android/i.test(ua)?'Åbn siden i Chrome, tryk ⋮ og vælg Installér app eller Føj til startskærm. Er du i en anden apps browser, så vælg først Åbn i browser.':'Åbn siden i Chrome eller Edge og vælg Installér app i browserens menu.';
 guide.hidden=false;
}
async function install(){
 if(!promptEvent){help();return}
 const current=promptEvent;promptEvent=null;
 try{await current.prompt();const choice=await current.userChoice;postpone(choice?.outcome==='accepted'?365:7);close()}
 catch(e){help()}
}
function show(){
 if(banner||installed()||snoozed()||(!mobile&&!promptEvent)||!document.body)return;
 banner=document.createElement('section');
 banner.id='stomas-install-banner';banner.setAttribute('role','region');banner.setAttribute('aria-label','Installér STOMAS');
 banner.innerHTML='<button type="button" class="install-close" aria-label="Luk">×</button><div class="install-head"><div class="install-logo" aria-hidden="true">S</div><div><strong class="install-title">STOMAS på din startskærm</strong><p>Åbn viden og fællesskab direkte fra din telefon.</p></div></div><div class="install-actions"><button type="button" class="install-now">Installér STOMAS</button><button type="button" class="install-later">Ikke nu</button></div><div class="install-guide" hidden></div>';
 banner.querySelector('.install-now').addEventListener('click',install);
 for(const sel of ['.install-close','.install-later'])banner.querySelector(sel).addEventListener('click',()=>{postpone(30);close()});
 document.body.appendChild(banner);
}
function start(){if(installed()||snoozed())return;if(mobile)timer=setTimeout(show,5000);else if(promptEvent)show()}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;if(document.readyState!=='loading'&&!snoozed())show()});
window.addEventListener('appinstalled',()=>{promptEvent=null;postpone(365);close()});
if('serviceWorker' in navigator&&isSecureContext)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{}),{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();