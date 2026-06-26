const $=s=>document.querySelector(s); const $$=s=>document.querySelectorAll(s);
const demo=[
{id:'rzk1',name:'RZK1',role:'OWNER',bio:'TEAM OKD founder. Black and red premium energy.',avatar:'https://api.dicebear.com/9.x/initials/svg?seed=RZK1&backgroundColor=111111&textColor=ff174d',background:'',discord:'RZK1#0001',lanyardId:'',kick:'itsmerobzkiii',twitch:'itsmerobzkiii',tiktok:'@itsmerzk1',roblox:'RZK1',facebook:'',instagram:'',profileMusic:''},
{id:'okd2',name:'Kcian',role:'BOSS',bio:'OKD main member.',avatar:'https://api.dicebear.com/9.x/initials/svg?seed=K&backgroundColor=222222&textColor=ff174d',background:'',discord:'',lanyardId:'',kick:'',twitch:'',tiktok:'',roblox:'',facebook:'',instagram:'',profileMusic:''},
{id:'okd3',name:'Charm',role:'MEMBER',bio:'eaaboo worldwide',avatar:'https://api.dicebear.com/9.x/initials/svg?seed=C&backgroundColor=222222&textColor=ff174d',background:'',discord:'',lanyardId:'',kick:'',twitch:'',tiktok:'',roblox:'',facebook:'',instagram:'',profileMusic:''},
{id:'okd4',name:'Irxs',role:'MEMBER',bio:'Offline',avatar:'https://api.dicebear.com/9.x/initials/svg?seed=I&backgroundColor=222222&textColor=ff174d',background:'',discord:'',lanyardId:'',kick:'',twitch:'',tiktok:'',roblox:'',facebook:'',instagram:'',profileMusic:''},
{id:'okd5',name:'Mika',role:'MEMBER',bio:'Offline',avatar:'https://api.dicebear.com/9.x/initials/svg?seed=M&backgroundColor=222222&textColor=ff174d',background:'',discord:'',lanyardId:'',kick:'',twitch:'',tiktok:'',roblox:'',facebook:'',instagram:'',profileMusic:''}
];
const defaultBg='linear-gradient(120deg,#050505,#16030a,#020202)';
// Change this passcode before uploading your site. Static sites cannot have perfect security, but this locks the editor for normal visitors.
const OWNER_PASSCODE = 'OKDOWNER123';
let ownerUnlocked = sessionStorage.getItem('okdOwnerUnlocked') === 'yes';

const DB_NAME='okdMediaDB';
const DB_STORE='audio';
function openMediaDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{ const db=req.result; if(!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE); };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error('IndexedDB open failed'));
  });
}
async function idbSet(key,val){ const db=await openMediaDB(); return new Promise((resolve,reject)=>{ const tx=db.transaction(DB_STORE,'readwrite'); tx.objectStore(DB_STORE).put(val,key); tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error||new Error('IndexedDB write failed')); }); }
async function idbGet(key){ const db=await openMediaDB(); return new Promise((resolve,reject)=>{ const tx=db.transaction(DB_STORE,'readonly'); const req=tx.objectStore(DB_STORE).get(key); req.onsuccess=()=>resolve(req.result||''); req.onerror=()=>reject(req.error||new Error('IndexedDB read failed')); }); }
async function idbDelete(key){ const db=await openMediaDB(); return new Promise((resolve,reject)=>{ const tx=db.transaction(DB_STORE,'readwrite'); tx.objectStore(DB_STORE).delete(key); tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error||new Error('IndexedDB delete failed')); }); }
function mediaRef(key){ return `idb:${key}`; }
async function resolveMediaUrl(url){ if(String(url||'').startsWith('idb:')) return await idbGet(String(url).slice(4)); return url||''; }

const DEFAULT_SETTINGS={music:'',bg:''};
function getLocalUpdatedAt(){ return +(localStorage.okdUpdatedAt || 0); }
function touchLocal(){ localStorage.okdUpdatedAt = String(Date.now()); }
function safeParse(json, fallback){ try{ return JSON.parse(json || ''); }catch(e){ return fallback; } }
const store={
  get members(){return safeParse(localStorage.okdMembers, demo)},
  set members(v){localStorage.okdMembers=JSON.stringify(v); touchLocal(); queueCloudSave();},
  get settings(){return safeParse(localStorage.okdSettings, DEFAULT_SETTINGS)},
  set settings(v){localStorage.okdSettings=JSON.stringify(v); touchLocal(); queueCloudSave();}
};

// Optional free cloud sync: Firebase Firestore.
// LocalStorage only updates your own browser. Firestore makes updates visible to every visitor.
let cloudRef=null, applyingCloud=false, cloudSaveTimer=null;
let cloudReady=false;
function updateCloudStatus(text, ok=false){ const el=$('#cloudStatus'); if(el){ el.textContent=text; el.className='cloud-status '+(ok?'cloud-ok':'cloud-bad'); } }
function firebaseConfigured(){
  const cfg=window.FIREBASE_CONFIG||window.firebaseConfig||{};
  return !!(cfg.apiKey && cfg.projectId && !String(cfg.apiKey).includes('PASTE_') && window.firebase && firebase.apps !== undefined && firebase.firestore);
}
function currentState(){ return { members: store.members, settings: store.settings, updatedAt: Date.now(), publishedAt: new Date().toISOString() }; }
function applyState(state){
  if(!state) return;
  const cloudUpdated = +(state.updatedAt || 0);
  const localUpdated = getLocalUpdatedAt();
  // Owner mode may have unsaved local edits. Do not let an older cloud snapshot wipe them.
  if(ownerUnlocked && localUpdated && cloudUpdated && localUpdated > cloudUpdated){
    updateCloudStatus('Cloud: connected, local edits newer. Click Save / Publish To Cloud.', true);
    return;
  }
  applyingCloud=true;
  if(Array.isArray(state.members)) localStorage.okdMembers=JSON.stringify(state.members);
  if(state.settings) localStorage.okdSettings=JSON.stringify({...DEFAULT_SETTINGS,...state.settings});
  if(cloudUpdated) localStorage.okdUpdatedAt=String(cloudUpdated);
  applyingCloud=false;
  render(); fetchLanyardPresence();
  if(!$('#app').classList.contains('hidden') && $('#profileView').classList.contains('hidden')) setupAudio(true);
}
async function saveCloudNow(silent=false){
  if(applyingCloud || !ownerUnlocked) return false;
  if(!cloudRef){ updateCloudStatus('Cloud: not connected. Check firebase-config.js / Firestore.', false); if(!silent) alert('Cloud is not connected. Check firebase-config.js, Firestore rules, and redeploy.'); return false; }
  try{
    updateCloudStatus('Cloud: saving...', false);
    const state=currentState();
    await cloudRef.set(state, {merge:false});
    localStorage.okdUpdatedAt=String(state.updatedAt);
    updateCloudStatus('Cloud: saved / public. Visitors will see this data.', true);
    return true;
  }catch(err){
    console.error(err);
    updateCloudStatus('Cloud: save failed. Check Firestore rules.', false);
    if(!silent) alert('Cloud save failed. Check Firestore rules or connection.');
    return false;
  }
}
function queueCloudSave(){
  if(applyingCloud || !cloudRef || !ownerUnlocked) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer=setTimeout(()=>saveCloudNow(true),250);
}
function initCloudSync(){
  try{
    if(!firebaseConfigured() || cloudRef) return;
    const cfg = window.FIREBASE_CONFIG || window.firebaseConfig;
    if(!firebase.apps.length) firebase.initializeApp(cfg);
    cloudRef=firebase.firestore().collection('teamokd').doc('publicShowcase');
    cloudReady=true;
    updateCloudStatus('Cloud: connected', true);
    initVisitorAnalytics();
    cloudRef.onSnapshot(snap=>{
      const state=snap.exists ? snap.data() : null;
      if(state) applyState(state);
      else {
        updateCloudStatus('Cloud: empty. Owner must click Save / Publish To Cloud.', false);
        if(ownerUnlocked) queueCloudSave();
      }
    }, err=>{
      console.error(err);
      updateCloudStatus('Cloud: read failed. Check Firestore Rules.', false);
    });
  }catch(e){ updateCloudStatus('Cloud: disabled / config error', false); console.warn('Firebase cloud sync disabled:', e); }
}


const socialIcons={
  discord:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.3 4.4A16.9 16.9 0 0 0 16.1 3l-.2.3c1.5.4 2.2 1 2.2 1s-1.9-1-4.2-1.2a14.7 14.7 0 0 0-4.8.3c-.2 0-.4.1-.6.2-.9.2-1.8.5-2.7 1 0 0 .7-.7 2.3-1l-.2-.3a16.9 16.9 0 0 0-4.2 1.5C1.1 8.5.5 12.1.8 15.7A16.8 16.8 0 0 0 6 18.3l.6-.8c-1.1-.4-2.1-1.1-3-2 0 0 .2.1.5.3 0 0 0 0 .1.1.1 0 .2.1.3.2.8.4 1.6.8 2.4 1 .7.2 1.5.4 2.3.5 1.5.2 3.2.2 4.8 0 .8-.1 1.5-.3 2.3-.5 1.1-.3 2.3-.9 3.4-1.6-.9.9-1.9 1.5-3 2l.6.8a16.7 16.7 0 0 0 5.2-2.6c.4-4.2-.6-7.8-2.2-11.3ZM8.4 14.2c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7.2 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"/></svg>`,
  kick:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h6v6h2V7h2V5h6v6h-2v2h2v6h-6v-2h-2v-2h-2v4H4V3Z"/></svg>`,
  twitch:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h16v11l-5 5h-4l-3 3v-3H5V3Zm2 2v12h4v2l2-2h4l2-2V5H7Zm5 3h2v5h-2V8Zm5 0h-2v5h2V8Z"/></svg>`,
  tiktok:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.2 3c.4 2.3 1.8 3.8 4 4v4.1a8.4 8.4 0 0 1-4-1.2v5.8c0 3.3-2.7 5.9-6 5.9s-6-2.6-6-5.9 2.7-5.9 6-5.9c.4 0 .8 0 1.2.1v4.3a2.2 2.2 0 0 0-1.2-.3 1.8 1.8 0 1 0 1.8 1.8V3h4.2Z"/></svg>`,
  roblox:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.3 2 22 5.3 18.7 22 2 18.7 5.3 2Zm6.1 7.1-2.2 2.2 2.2 2.2 2.2-2.2-2.2-2.2Z"/></svg>`,
  facebook:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-3.1 0-5 1.9-5 5v3H6v4h3v6h4v-6h3.2l.8-4h-4V9c0-.7.3-1 1-1Z"/></svg>`,
  instagram:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6ZM17.5 6.6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/></svg>`
};
function socialIcon(type){ return socialIcons[type] || type.toUpperCase(); }
function socialButton(type,value,href){
  const label = `${type}: ${value}`;
  const icon = socialIcon(type);
  return href
    ? `<a class="social-icon ${type}" target="_blank" rel="noopener" href="${href}" title="${label}" aria-label="${label}">${icon}</a>`
    : `<span class="social-icon ${type}" title="${label}" aria-label="${label}">${icon}</span>`;
}



// Lanyard Discord presence integration
// Add each member's numeric Discord User ID in Owner Panel. That user must be in the Lanyard Discord server.
const lanyardState = {};
let currentProfileId = null;
function isValidDiscordSnowflake(id){ return /^\d{17,20}$/.test(String(id||'').trim()); }
function getMemberDiscordId(m){ return String(m.lanyardId || (isValidDiscordSnowflake(m.discord) ? m.discord : '') || '').trim(); }
function escapeHTML(v){ return String(v ?? '').replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function statusText(status){
  return ({online:'ONLINE', idle:'IDLE', dnd:'DND', offline:'OFFLINE'})[status] || 'OFFLINE';
}
function statusEmoji(status){
  return '●';
}
function statusClass(status){ return ['online','idle','dnd','offline'].includes(status) ? status : 'offline'; }
function presenceFor(m){
  const id = getMemberDiscordId(m);
  return id && lanyardState[id] ? lanyardState[id] : null;
}
function discordAvatarUrl(p, fallback=''){
  const u = p?.discord_user || {};
  if(u.id && u.avatar){
    const ext = String(u.avatar).startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${ext}?size=512&v=${u.avatar}`;
  }
  return fallback || '';
}

function fallbackAvatarFor(m){
  return m.avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(m.name || 'OKD')}&backgroundColor=111111&textColor=ff174d`;
}
function avatarForMember(m, p){
  // Priority: live Discord avatar from Lanyard -> owner avatar URL -> generated fallback.
  // This updates both homepage cards and the profile page whenever Lanyard refreshes.
  return discordAvatarUrl(p, fallbackAvatarFor(m));
}
function discordBannerUrl(p, fallback=''){
  // Banner intentionally disabled for the clean TEAM OKD profile page.
  // Avatar still syncs from Lanyard, but the profile background stays owner-editable.
  return fallback || '';
}
function applyProfileVisuals(m, p){
  const avatar = avatarForMember(m, p);
  $('#profileAvatar').src = avatar;
  $('#profileBanner').style.backgroundImage = 'none';
  $('#profileBg').style.backgroundImage = m.background ? `url(${m.background})` : defaultBg;
}
function spotifyText(p){
  if(!p || !p.listening_to_spotify || !p.spotify) return '';
  return `${p.spotify.song || p.spotify.track_name || 'Spotify'} - ${p.spotify.artist || p.spotify.artist_name || ''}`.trim();
}
function spotifyCover(p){
  if(!p || !p.spotify) return '';
  return p.spotify.album_art_url || p.spotify.album_art || '';
}
function customStatusText(p){
  const custom = (p?.activities||[]).find(a=>a.type===4 || a.name==='Custom Status');
  if(!custom) return '';
  return [custom.emoji?.name, custom.state].filter(Boolean).join(' ');
}
function mainActivity(p){
  if(!p) return null;
  return (p.activities||[]).find(a=>a.type!==4 && a.name!=='Spotify') || null;
}
function activityLine(p){
  if(!p) return '';
  if(p.listening_to_spotify) return `🎵 ${spotifyText(p)}`;
  const a=mainActivity(p);
  if(!a) return customStatusText(p) || '';
  const name=a.name || 'Activity';
  const details=a.details || a.state || '';
  return details ? `🎮 ${name} — ${details}` : `🎮 ${name}`;
}
function profilePresenceHTML(p){
  if(!p) return `<div class="lanyard-panel"><div class="lanyard-title">Discord Live</div><div class="lanyard-muted">Add Discord User ID and join Lanyard server.</div></div>`;
  const st=statusClass(p.discord_status);
  const user=p.discord_user||{};
  const avatar=user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : '';
  const spotify=spotifyText(p);
  const cover=spotifyCover(p);
  const custom=customStatusText(p);
  const act=mainActivity(p);
  return `<div class="lanyard-panel status-${st}">
    <div class="lanyard-title">Discord Live</div>
    <div class="lanyard-row">${avatar?`<img class="lanyard-avatar" src="${avatar}" alt="Discord avatar">`:''}<div><b>${escapeHTML(user.global_name || user.username || 'Discord')}</b><span>${statusEmoji(st)} ${statusText(st)}</span></div></div>
    ${custom?`<div class="lanyard-chip">💬 ${escapeHTML(custom)}</div>`:''}
    ${spotify?`<div class="spotify-box">${cover?`<img src="${cover}" alt="Spotify album art">`:''}<div><b>Listening to Spotify</b><span>${escapeHTML(spotify)}</span></div></div>`:''}
    ${act?`<div class="lanyard-chip">🎮 ${escapeHTML(act.name||'Activity')}${act.details?` — ${escapeHTML(act.details)}`:''}${act.state?` · ${escapeHTML(act.state)}`:''}</div>`:''}
  </div>`;
}
function cardPresenceHTML(p){
  const line=activityLine(p);
  return escapeHTML(line || '');
}
async function fetchLanyardPresence(){
  const members = store.members || [];
  const ids = [...new Set(members.map(getMemberDiscordId).filter(isValidDiscordSnowflake))];
  if(!ids.length) return;
  await Promise.all(ids.map(async id=>{
    try{
      const res = await fetch(`https://api.lanyard.rest/v1/users/${id}`, {cache:'no-store'});
      const json = await res.json();
      if(json && json.success && json.data){ lanyardState[id] = json.data; }
    }catch(e){ console.warn('Lanyard failed for', id, e); }
  }));
  updatePresenceUI();
}
function updatePresenceUI(){
  (store.members||[]).forEach(m=>{
    const p = presenceFor(m);
    const st = p ? statusClass(p.discord_status) : 'offline';
    document.querySelectorAll(`[data-member-id="${m.id}"]`).forEach(el=>{
      el.classList.remove('status-online','status-idle','status-dnd','status-offline');
      el.classList.add(`status-${st}`);
      const role = el.querySelector('.member-role');
      if(role){ role.textContent = `${statusEmoji(st)} ${statusText(st)}`; }
      const img = el.querySelector('.avatar');
      if(img){ img.src = avatarForMember(m, p); img.alt = `${m.name || 'TEAM OKD'} Discord avatar`; }
      const activity = el.querySelector('.member-activity');
      if(activity){ activity.textContent = activityLine(p) || ''; }
    });
    if(currentProfileId === m.id && !document.querySelector('#profileView')?.classList.contains('hidden')){
      applyProfileVisuals(m, p);
      const statusEl=document.querySelector('#profileStatus');
      if(statusEl){ statusEl.textContent=`${statusEmoji(st)} ${statusText(st)}`; statusEl.className=`profile-status status-${st}`; }
      const act=document.querySelector('#profileActivity');
      if(act){ act.textContent = activityLine(p) || ''; }
    }
  });
}

function linkFor(type,val){
  if(!val) return '';
  if(String(val).startsWith('http')) return val;
  const clean=String(val).replace('@','');
  const map={
    kick:`https://kick.com/${clean}`,
    twitch:`https://twitch.tv/${clean}`,
    tiktok:`https://tiktok.com/@${clean}`,
    roblox:`https://www.roblox.com/users/${clean}/profile`,
    facebook:`https://facebook.com/${clean}`,
    instagram:`https://instagram.com/${clean}`
  };
  return map[type]||'';
}
function render(){const members=store.members, settings=store.settings; $('#memberCount').textContent=members.length; document.body.style.backgroundImage=settings.bg?`radial-gradient(circle at 50% 15%,#22040d55,#000 60%),url(${settings.bg})`:''; $('#featuredMembers').innerHTML=''; $('#memberGrid').innerHTML=''; members.forEach((m,i)=>{const card=document.createElement('div'); card.className='member-card '+(i<2?'featured':''); card.dataset.memberId=m.id; const pres=presenceFor(m); const st=pres?statusClass(pres.discord_status):'offline'; card.classList.add(`status-${st}`); card.innerHTML=`<div class="watermark">TEAM OKD</div><div class="edit-dot">★</div><div class="member-content"><img class="avatar" src="${avatarForMember(m,pres)}" alt="${escapeHTML(m.name)} avatar"><div class="member-name">${m.name}</div><div class="member-title">${m.role||'MEMBER'}</div><div class="member-role">${statusEmoji(st)} ${statusText(st)}</div><div class="member-activity">${cardPresenceHTML(pres)}</div></div>`; card.onclick=()=>openProfile(m.id); (i<2?$('#featuredMembers'):$('#memberGrid')).appendChild(card);}); renderAdmin();}
function openProfile(id){
  const m=store.members.find(x=>x.id===id); if(!m)return;
  trackVisit('profile', m.name || id);
  currentProfileId = id;
  const pres=presenceFor(m);
  const st=pres?statusClass(pres.discord_status):'offline';
  applyProfileVisuals(m, pres);
  $('#profileName').textContent=m.name;
  $('#profileSlug').textContent=(m.role||'MEMBER').toUpperCase();
  $('#profileStatus').textContent=`${statusEmoji(st)} ${statusText(st)}`;
  $('#profileStatus').className=`profile-status status-${st}`;
  $('#profileActivity').textContent=activityLine(pres) || '';
  $('#profileBio').textContent=m.bio||'TEAM OKD member';
  const socials=['discord','kick','twitch','tiktok','roblox','facebook','instagram'];
  $('#socialLinks').innerHTML=socials.map(s=>{let v=m[s]; if(!v)return ''; let href=linkFor(s,v); return socialButton(s,v,href);}).join('');
  $('#profileView').classList.remove('hidden');
  if(m.profileMusic){ playDirectAudio(m.profileMusic, `${m.name} Music`, false); }
  else { stopAudio(); }
}
function updateOwnerUI(){
  const login=$('#ownerLoginBox'), tools=$('#ownerTools');
  if(!login || !tools) return;
  login.classList.toggle('hidden', ownerUnlocked);
  tools.classList.toggle('hidden', !ownerUnlocked);
}
function requireOwner(){
  if(ownerUnlocked) return true;
  alert('Owner access only. Please enter the owner passcode first.');
  return false;
}
function renderAdmin(){
  const box=$('#adminMembers'); if(!box)return;
  updateOwnerUI();
  if(!ownerUnlocked){ box.innerHTML=''; return; }
  box.innerHTML=store.members.map(m=>`<div class="admin-row"><b>${m.name}</b><span><button onclick="editMember('${m.id}')">Edit</button><button onclick="removeMember('${m.id}')">Remove</button></span></div>`).join('');
  $('#musicUrl').value=store.settings.music||''; $('#globalBg').value=store.settings.bg||'';
}
window.editMember=id=>{if(!requireOwner())return; const m=store.members.find(x=>x.id===id); ['id','name','role','avatar','background','profileMusic','bio','discord','lanyardId','kick','twitch','tiktok','roblox','facebook','instagram'].forEach(k=>{const el=$('#'+(k==='id'?'editId':k)); if(el)el.value=m[k]||''});}
window.removeMember=id=>{if(!requireOwner())return; if(!confirm('Remove this member?'))return; store.members=store.members.filter(m=>m.id!==id); render();}
$('#memberForm').onsubmit=async e=>{
  e.preventDefault(); if(!requireOwner())return;
  let members=store.members; const id=$('#editId').value||crypto.randomUUID(); const m={id};
  ['name','role','avatar','background','profileMusic','bio','discord','lanyardId','kick','twitch','tiktok','roblox','facebook','instagram'].forEach(k=>m[k]=$('#'+k).value.trim());
  const file=$('#profileMusicUpload')?.files?.[0];
  try{
    if(file){
      const data = await readAudioFileAsDataUrl(file);
      const mediaKey = `memberMusic:${id}`;
      await idbSet(mediaKey, data);
      m.profileMusic = mediaRef(mediaKey);
    }
    const idx=members.findIndex(x=>x.id===id); idx>=0?members[idx]=m:members.push(m);
    store.members=members; e.target.reset(); $('#editId').value=''; if($('#profileMusicUpload')) $('#profileMusicUpload').value=''; render();
    const published = await saveCloudNow(true);
    alert((published ? 'Member saved and published.' : 'Member saved locally but cloud publish failed. Click Save / Publish To Cloud and check Firestore Rules.') + (file ? ' Uploaded music is local only; use Discord/direct audio URL if visitors must hear it.' : ''));//
  }catch(err){ alert(err.message || 'Profile music upload failed.'); }
}
$('#saveSite').onclick=async()=>{
  if(!requireOwner())return;
  let music=$('#musicUrl').value.trim();
  const file=$('#musicUpload')?.files?.[0];
  try{
    if(file){
      const data = await readAudioFileAsDataUrl(file);
      await idbSet('siteMusic', data);
      music = mediaRef('siteMusic');
    }
    store.settings={music,bg:$('#globalBg').value.trim()};
    if($('#musicUpload')) $('#musicUpload').value='';
    setupAudio(); render();
    await saveCloudNow(true);
    alert(file ? 'Site settings saved and published. Uploaded music is local only; use Discord/direct audio URL if visitors must hear it.' : 'Site settings saved and published.');
  }catch(err){ alert(err.message || 'Music upload failed.'); }
};
$('#saveCloudNow').onclick=async()=>{ if(!requireOwner())return; const ok=await saveCloudNow(false); if(ok) alert('Published to Firebase. Visitors will see this showcase/profile data.'); };
$('#resetData').onclick=async()=>{if(!requireOwner())return; if(!confirm('Reset all demo data?'))return; localStorage.removeItem('okdMembers');localStorage.removeItem('okdSettings'); try{ await idbDelete('siteMusic'); }catch(e){} render(); await saveCloudNow(true);};
$('#adminToggle').onclick=()=>{ $('#adminPanel').classList.toggle('hidden'); updateOwnerUI(); }; $('#closeAdmin').onclick=()=>$('#adminPanel').classList.add('hidden'); $('#backBtn').onclick=()=>{ currentProfileId=null; $('#profileView').classList.add('hidden'); setupAudio(true); };
$('#ownerLoginBtn').onclick=()=>{ const pass=$('#ownerPass').value; if(pass===OWNER_PASSCODE){ ownerUnlocked=true; sessionStorage.setItem('okdOwnerUnlocked','yes'); $('#ownerPass').value=''; renderAdmin(); } else { alert('Wrong owner passcode.'); } };
$('#ownerLogoutBtn').onclick=()=>{ ownerUnlocked=false; sessionStorage.removeItem('okdOwnerUnlocked'); renderAdmin(); };
$('#enterBtn').onclick=()=>{$('#enterScreen').classList.add('hidden'); $('#app').classList.remove('hidden'); setupAudio(true);};

// Hidden music engine. Site music starts after ENTER. Profile music auto-starts when a member profile opens.
let activeMusicUrl = '';

function isYouTubeUrl(url){ return /youtu\.be|youtube\.com|music\.youtube\.com/i.test(String(url||'')); }
function readAudioFileAsDataUrl(file){
  return new Promise((resolve,reject)=>{
    if(!file) return resolve('');
    if(!file.type.startsWith('audio/')) return reject(new Error('Please upload an audio file.'));
    if(file.size > 25 * 1024 * 1024) return reject(new Error('File is too large. Keep uploads under 25MB.'));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read music file.'));
    reader.readAsDataURL(file);
  });
}
function setSongLabels(){ /* No public music UI. */ }
function stopAudio(){ const audio=$('#audio'); if(audio){ audio.pause(); audio.currentTime=0; } }
async function playDirectAudio(url, title='Custom Music', showError=true){
  const audio=$('#audio');
  if(!audio || !url) return;
  if(isYouTubeUrl(url)){
    if(showError) alert('YouTube links are preview only and cannot be used as reliable background music. Use uploaded MP3/WAV/OGG or a Discord CDN direct audio link.');
    return;
  }
  try{
    const resolvedUrl = await resolveMediaUrl(url);
    activeMusicUrl=url;
    if(audio.src !== new URL(resolvedUrl, location.href).href){ audio.src=resolvedUrl; }
    audio.volume=0.45;
    await audio.play();
  }catch(err){
    if(showError) alert('Music cannot play. Use uploaded audio, a direct MP3/WAV/OGG URL, or a Discord CDN audio attachment link.');
  }
}
async function setupAudio(play=false){
  const url=(store.settings.music||'').trim();
  const audio=$('#audio'); if(!audio) return;
  stopAudio(); activeMusicUrl=url;
  if(!url || isYouTubeUrl(url)) return;
  try{
    const resolvedUrl = await resolveMediaUrl(url);
    audio.src=resolvedUrl; audio.volume=0.45;
    if(play) await playDirectAudio(url,'Site Music',false);
  }catch(e){}
}
function clock(){const d=new Date(); $('#timeNow').textContent=d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); $('#dateNow').textContent=d.toLocaleDateString([], {weekday:'long',month:'short',day:'numeric'}).toUpperCase();} setInterval(clock,1000); clock();
localStorage.okdVisits=(+(localStorage.okdVisits||0)+1); $('#visitCount').textContent=localStorage.okdVisits;
trackVisit('home', 'Home');
const c=$('#particles'),ctx=c.getContext('2d'); let ps=[]; function size(){c.width=innerWidth;c.height=innerHeight;ps=Array.from({length:95},()=>({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*2+0.4,s:Math.random()*0.6+0.15,a:Math.random()}));} addEventListener('resize',size); size(); function anim(){ctx.clearRect(0,0,c.width,c.height); ps.forEach(p=>{p.y-=p.s;if(p.y<0)p.y=c.height; ctx.globalAlpha=p.a; ctx.fillStyle=Math.random()>.88?'#ff174d':'#7b1025'; ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}); requestAnimationFrame(anim)} anim();
initCloudSync();
render();
fetchLanyardPresence();
setInterval(fetchLanyardPresence, 30000);


/* TEAM OKD Visitor Analytics + owner-only IP security log
   Stores IP + approximate location in Firestore for security purposes. */
const VISITOR_SESSION_KEY = 'okdVisitorId';
let visitorLogUnsub = null;
let visitorHeartbeatTimer = null;
let visitorNetworkInfoPromise = null;
async function getVisitorNetworkInfo(){
  if(visitorNetworkInfoPromise) return visitorNetworkInfoPromise;
  visitorNetworkInfoPromise = (async()=>{
    try{
      const res = await fetch('https://ipapi.co/json/', {cache:'no-store'});
      if(!res.ok) throw new Error('IP lookup failed');
      const d = await res.json();
      return { ip: d.ip || '', country: d.country_name || d.country || '', city: d.city || '', region: d.region || '', isp: d.org || d.asn || '' };
    }catch(e){
      try{
        const res = await fetch('https://api.ipify.org?format=json', {cache:'no-store'});
        const d = await res.json();
        return {ip:d.ip||'', country:'', city:'', region:'', isp:''};
      }catch(_){ return {ip:'', country:'', city:'', region:'', isp:''}; }
    }
  })();
  return visitorNetworkInfoPromise;
}
function getVisitorId(){
  let id = localStorage.getItem(VISITOR_SESSION_KEY);
  if(!id){ id = (crypto.randomUUID ? crypto.randomUUID() : 'v_'+Date.now()+'_'+Math.random().toString(16).slice(2)); localStorage.setItem(VISITOR_SESSION_KEY,id); }
  return id;
}
function browserInfo(){
  const ua = navigator.userAgent || '';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
  const device = /Mobi|Android|iPhone|iPad|iPod/.test(ua) ? 'Mobile' : 'Desktop';
  return { browser, os, device };
}
function visitorDb(){
  try{
    if(!firebaseConfigured()) return null;
    if(!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG || window.firebaseConfig);
    return firebase.firestore();
  }catch(e){ return null; }
}
async function visitorPayload(type='home', profile='Home'){
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
  const network = await getVisitorNetworkInfo();
  return {
    visitorId:getVisitorId(), type, profile, path:location.pathname || '/',
    ...browserInfo(), ...network, timezone:tz,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    dayKey: new Date().toISOString().slice(0,10)
  };
}
async function trackVisit(type='home', profile='Home'){
  const db = visitorDb(); if(!db) return;
  try{
    const payload = await visitorPayload(type, profile);
    await db.collection('teamokd_visits').add(payload);
    await db.collection('teamokd_online').doc(getVisitorId()).set({
      visitorId:getVisitorId(), path:location.pathname || '/', profile, type,
      ...browserInfo(), ...(await getVisitorNetworkInfo()), timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, {merge:true});
    updateVisitCountFromCloud();
  }catch(e){ console.warn('Visitor analytics disabled:', e); }
}
async function updateVisitCountFromCloud(){
  const db = visitorDb(); if(!db) return;
  try{
    const snap = await db.collection('teamokd_visits').limit(1000).get();
    const total = snap.size;
    const el=$('#visitCount'); if(el && total) el.textContent=total;
  }catch(e){}
}
function initVisitorAnalytics(){
  const db = visitorDb(); if(!db) return;
  if(visitorHeartbeatTimer) clearInterval(visitorHeartbeatTimer);
  visitorHeartbeatTimer = setInterval(()=>{
    getVisitorNetworkInfo().then(net=>db.collection('teamokd_online').doc(getVisitorId()).set({lastSeen:firebase.firestore.FieldValue.serverTimestamp(), path:location.pathname || '/', ...browserInfo(), ...net}, {merge:true})).catch(()=>{});
  }, 30000);
  if(ownerUnlocked) startOwnerVisitorDashboard();
}
function fmtTime(ts){
  try{ const d = ts?.toDate ? ts.toDate() : new Date(); return d.toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); }catch(e){ return 'now'; }
}
async function loadVisitorDashboard(){
  const db = visitorDb(); if(!db || !ownerUnlocked) return;
  try{
    const today = new Date().toISOString().slice(0,10);
    const recent = await db.collection('teamokd_visits').orderBy('createdAt','desc').limit(80).get();
    const docs = recent.docs.map(d=>({id:d.id,...d.data()}));
    const totalSnap = await db.collection('teamokd_visits').limit(1000).get();
    const total = totalSnap.size;
    const todayCount = docs.filter(v=>v.dayKey===today).length;
    const cutoff = Date.now() - 2*60*1000;
    const onlineSnap = await db.collection('teamokd_online').get();
    let online = 0;
    onlineSnap.forEach(d=>{ const v=d.data(); const t=v.lastSeen?.toDate ? v.lastSeen.toDate().getTime() : 0; if(t>cutoff) online++; });
    const counts={}; docs.forEach(v=>{ if(v.profile && v.profile!=='Home') counts[v.profile]=(counts[v.profile]||0)+1; });
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
    const set=(id,val)=>{ const el=$(id); if(el) el.textContent=val; };
    set('#dashTotalVisits', total); set('#dashTodayVisits', todayCount); set('#dashOnlineNow', online); set('#onlineCount', online); set('#dashTopProfile', top);
    const log=$('#visitorLog');
    if(log){
      log.innerHTML = docs.length ? docs.slice(0,50).map(v=>`<div class="visitor-row"><div><b>${escapeHTML(v.profile||'Home')}</b><span>${escapeHTML(v.type||'visit')} · ${escapeHTML(v.path||'/')}</span></div><div><b>${escapeHTML(v.ip||'No IP')}</b><span>${escapeHTML([v.city,v.country].filter(Boolean).join(', ') || 'Unknown location')} · ${escapeHTML(v.isp||'')}</span></div><div><b>${escapeHTML(v.device||'Device')}</b><span>${escapeHTML(v.browser||'Browser')} · ${escapeHTML(v.os||'OS')}</span></div><time>${fmtTime(v.createdAt)}</time></div>`).join('') : '<p class="hint">No visitor logs yet.</p>';
    }
  }catch(e){ const log=$('#visitorLog'); if(log) log.innerHTML='<p class="hint">Could not load visitors. Check Firestore rules.</p>'; console.warn(e); }
}
function startOwnerVisitorDashboard(){
  const db=visitorDb(); if(!db || visitorLogUnsub) return;
  loadVisitorDashboard();
  visitorLogUnsub = db.collection('teamokd_visits').orderBy('createdAt','desc').limit(20).onSnapshot(()=>loadVisitorDashboard(), err=>console.warn(err));
}
const oldUpdateOwnerUI = updateOwnerUI;
updateOwnerUI = function(){ oldUpdateOwnerUI(); if(ownerUnlocked) startOwnerVisitorDashboard(); };
setInterval(()=>{ if(ownerUnlocked) loadVisitorDashboard(); }, 45000);
setTimeout(()=>updateVisitCountFromCloud(), 1500);
setTimeout(()=>{ const b=$('#refreshVisitors'); if(b) b.onclick=loadVisitorDashboard; }, 500);
