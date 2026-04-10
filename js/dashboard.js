// ============================================================
// DripBio.bond — Dashboard (v2: Themes, Fonts, Buttons, Socials, Drag-Drop)
// ============================================================

import { auth, db } from './firebase-config.js';
import { requireAuth, getUserProfile, showToast, logOut, resendVerificationEmail } from './auth.js';
import {
  doc, updateDoc, collection, addDoc, deleteDoc,
  onSnapshot, query, orderBy, writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Constants ────────────────────────────────────────────────
const THEMES = {
  glass:     { bg: 'radial-gradient(ellipse at 50% 0%,rgba(168,85,247,.14) 0%,transparent 55%),#0f0f0f', accent: '#a855f7', name: 'Glass' },
  midnight:  { bg: 'radial-gradient(ellipse at 50% 0%,rgba(124,58,237,.22) 0%,transparent 60%),#07031a', accent: '#7c3aed', name: 'Midnight' },
  cyberpunk: { bg: 'radial-gradient(ellipse at 30% 20%,rgba(236,72,153,.16) 0%,transparent 50%),radial-gradient(ellipse at 70% 80%,rgba(6,182,212,.13) 0%,transparent 50%),#0d0d0d', accent: '#ec4899', name: 'Cyber' },
  sunset:    { bg: 'radial-gradient(ellipse at 50% 0%,rgba(249,115,22,.18) 0%,transparent 55%),radial-gradient(ellipse at 80% 100%,rgba(168,85,247,.1) 0%,transparent 50%),#120800', accent: '#f97316', name: 'Sunset' },
  forest:    { bg: 'radial-gradient(ellipse at 50% 0%,rgba(34,197,94,.15) 0%,transparent 55%),#040e07', accent: '#22c55e', name: 'Forest' },
};

const FONTS = [
  { name: 'Space Grotesk', label: 'Space Grotesk — Tech' },
  { name: 'Outfit',        label: 'Outfit — Clean'       },
  { name: 'Bangers',       label: 'Bangers — Bold'       },
  { name: 'Pacifico',      label: 'Pacifico — Fun'       },
];

const SOCIALS = [
  { id: 'instagram', label: 'Instagram',  icon: '📸' },
  { id: 'twitter',   label: 'X / Twitter',icon: '𝕏'  },
  { id: 'github',    label: 'GitHub',     icon: '🐙' },
  { id: 'linkedin',  label: 'LinkedIn',   icon: '💼' },
  { id: 'youtube',   label: 'YouTube',    icon: '▶️' },
];

// ── State ────────────────────────────────────────────────────
let currentUser    = null;
let currentProfile = null;
let links          = [];
let sortableInst   = null;

// ── Helpers ──────────────────────────────────────────────────
const $       = id => document.getElementById(id);
const setVal  = (id, v) => { const e=$( id); if(e) e.value=v; };
const setAttr = (id, a, v) => { const e=$(id); if(e) e.setAttribute(a,v); };
const setText = (id, v) => { const e=$(id); if(e) e.textContent=v; };
const esc     = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const avatarUrl = (seed, style='lorelei') =>
  `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;

// ── Bootstrap ────────────────────────────────────────────────
requireAuth(async user => {
  currentUser = user;

  // ── ENFORCE VERIFICATION ──
  try { await user.reload(); } catch {}
  const freshUser = auth.currentUser || user;
  
  if (!freshUser.emailVerified) {
    window.location.href = '/email-sent.html';
    return;
  }

  try { 
    currentProfile = await getUserProfile(user.uid); 
    if (!currentProfile || currentProfile.isVerified !== true) {
      window.location.href = '/verify-complete.html';
      return;
    }
  }
  catch (e) { 
    console.error(e); 
    window.location.href = '/verify-complete.html';
    return; 
  }

  // If we made it here, user is fully verified and profile exists!
  if (currentProfile.isAdmin === true) {
    const adminBtn = document.getElementById('admin-panel-btn');
    if (adminBtn) adminBtn.style.display = 'inline-flex';
  }
  bootstrapNavbar();
  bootstrapProfile();
  bootstrapCustomize();
  subscribeLinks();
});

// ── Orphaned Account ─────────────────────────────────────────
function showOrphanError(user) {
  document.querySelector('.dash-layout').innerHTML = `
    <div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;gap:1rem;padding:2rem">
      <div style="font-size:3rem">⚠️</div>
      <h2>Profile data not found</h2>
      <p style="color:var(--text-secondary);max-width:400px;font-size:0.9rem;line-height:1.7">
        Auth account (<strong>${user.email}</strong>) exists but Firestore data is missing.
        Publish Firestore rules, then sign up fresh.
      </p>
      <div style="display:flex;gap:.75rem;flex-wrap:wrap;justify-content:center">
        <button id="orphan-out" class="btn btn-primary">Log Out & Re-Signup</button>
        <a href="https://console.firebase.google.com" target="_blank" class="btn btn-ghost">Firebase Console 🔗</a>
      </div>
    </div>`;
  $('orphan-out')?.addEventListener('click', async () => { await logOut(); window.location.href='/signup.html'; });
}

// ── Navbar ────────────────────────────────────────────────────
function bootstrapNavbar() {
  const { username, avatarStyle='lorelei' } = currentProfile;
  setText('user-pill-name', '@'+username);
  setAttr('user-pill-avatar','src', avatarUrl(username, avatarStyle));
  setText('profile-url-display', `${location.hostname}/${username}`);

  const viewBtn = $('view-public-btn');
  if (viewBtn) viewBtn.href = `/${username}`;

  $('logout-btn')?.addEventListener('click', async () => { await logOut(); location.href='/login.html'; });
  $('copy-link-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(`${location.origin}/${username}`)
      .then(() => showToast('Link copied! 🔗','success'));
  });
}

// ── Profile Panel ─────────────────────────────────────────────
function bootstrapProfile() {
  const { displayName, bio, username, avatarStyle='lorelei' } = currentProfile;
  setVal('display-name-input', displayName||'');
  setVal('bio-input', bio||'');
  setAttr('profile-avatar-img','src', avatarUrl(username, avatarStyle));

  document.querySelectorAll('.avatar-style-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.style===avatarStyle);
    btn.addEventListener('click', () => pickAvatar(btn.dataset.style));
  });
  $('save-profile-btn')?.addEventListener('click', saveProfile);
  updatePreview();
}

async function pickAvatar(style) {
  currentProfile.avatarStyle = style;
  document.querySelectorAll('.avatar-style-btn').forEach(b => b.classList.toggle('active', b.dataset.style===style));
  setAttr('profile-avatar-img','src', avatarUrl(currentProfile.username, style));
  await saveField({ avatarStyle: style });
  updatePreview();
}

async function saveProfile() {
  const displayName = $('display-name-input')?.value.trim();
  const bio         = $('bio-input')?.value.trim();
  if (!displayName) { showToast('Display name required!','error'); return; }
  const btn = $('save-profile-btn');
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span> Saving…';
  try {
    await saveField({ displayName, bio });
    currentProfile.displayName=displayName; currentProfile.bio=bio;
    showToast('Profile saved! ✨','success'); updatePreview();
  } catch { showToast('Error saving.','error'); }
  finally { btn.disabled=false; btn.textContent='Save Profile'; }
}

// ── Customize Panel ──────────────────────────────────────────
function bootstrapCustomize() {
  // Tabs
  $('tab-btn-profile')?.addEventListener('click', () => switchTab('profile'));
  $('tab-btn-customize')?.addEventListener('click', () => switchTab('customize'));

  initThemePicker();
  initFontPicker();
  initBtnPickers();
  initSocialForm();
}

function switchTab(name) {
  $('tab-profile').style.display  = name==='profile'  ? '' : 'none';
  $('tab-customize').style.display = name==='customize' ? '' : 'none';
  $('tab-btn-profile').classList.toggle('active', name==='profile');
  $('tab-btn-customize').classList.toggle('active', name==='customize');
}

// Theme Picker
function initThemePicker() {
  const grid = $('theme-grid'); if (!grid) return;
  const cur = currentProfile.theme || 'glass';

  Object.entries(THEMES).forEach(([key, t]) => {
    const wrap = document.createElement('div');
    const sw   = document.createElement('div');
    sw.className = 'theme-swatch' + (key===cur ? ' active' : '');
    sw.style.background = t.bg;
    sw.title = t.name;
    sw.addEventListener('click', async () => {
      document.querySelectorAll('.theme-swatch').forEach(s=>s.classList.remove('active'));
      sw.classList.add('active');
      currentProfile.theme = key;
      await saveField({ theme: key, customBg: '' });
      updatePreview();
    });
    const nm = document.createElement('div');
    nm.className='theme-swatch-name'; nm.textContent=t.name;
    wrap.appendChild(sw); wrap.appendChild(nm);
    grid.appendChild(wrap);
  });

  // Custom BG
  const colorInput = $('custom-bg-input');
  if (colorInput) {
    if (currentProfile.customBg) colorInput.value = currentProfile.customBg;
    let debounce;
    colorInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        document.querySelectorAll('.theme-swatch').forEach(s=>s.classList.remove('active'));
        currentProfile.theme='custom'; currentProfile.customBg=colorInput.value;
        await saveField({ theme:'custom', customBg: colorInput.value });
        updatePreview();
      }, 400);
    });
  }
}

// Font Picker
function initFontPicker() {
  const container = $('font-picker'); if (!container) return;
  const cur = currentProfile.font || 'Space Grotesk';

  FONTS.forEach(f => {
    const btn = document.createElement('div');
    btn.className = 'font-opt' + (f.name===cur ? ' active' : '');
    btn.innerHTML = `<span style="font-family:'${f.name}',sans-serif">${f.label}</span><span class="tick">${f.name===cur?'✓':''}</span>`;
    btn.addEventListener('click', async () => {
      container.querySelectorAll('.font-opt').forEach(el => { el.classList.remove('active'); el.querySelector('.tick').textContent=''; });
      btn.classList.add('active'); btn.querySelector('.tick').textContent='✓';
      currentProfile.font = f.name;
      await saveField({ font: f.name });
      updatePreview();
      showToast(`Font: ${f.name} ✅`,'success');
    });
    container.appendChild(btn);
  });
}

// Button Pickers
function initBtnPickers() {
  const curShape = currentProfile.btnShape||'soft';
  const curFill  = currentProfile.btnFill||'glass';

  document.querySelectorAll('#btn-shape-picker .pick-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.shape===curShape);
    btn.addEventListener('click', async () => {
      document.querySelectorAll('#btn-shape-picker .pick-opt').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentProfile.btnShape = btn.dataset.shape;
      await saveField({ btnShape: btn.dataset.shape });
      updatePreview();
    });
  });

  document.querySelectorAll('#btn-fill-picker .pick-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.fill===curFill);
    btn.addEventListener('click', async () => {
      document.querySelectorAll('#btn-fill-picker .pick-opt').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentProfile.btnFill = btn.dataset.fill;
      await saveField({ btnFill: btn.dataset.fill });
      updatePreview();
    });
  });
}

// Social Links Form
function initSocialForm() {
  const container = $('socials-form'); if (!container) return;
  const saved = currentProfile.socials || {};

  SOCIALS.forEach(s => {
    const row = document.createElement('div');
    row.className = 'social-row';
    row.innerHTML = `
      <div class="soc-ico">${s.icon}</div>
      <input id="soc-${s.id}" type="url" placeholder="${s.label} URL" value="${esc(saved[s.id]||'')}">`;
    container.appendChild(row);
  });

  $('save-socials-btn')?.addEventListener('click', async () => {
    const socials = {};
    SOCIALS.forEach(s => { socials[s.id] = ($(`soc-${s.id}`)?.value.trim()||''); });
    const btn = $('save-socials-btn');
    btn.disabled=true; btn.innerHTML='<span class="spinner"></span>';
    try {
      await saveField({ socials });
      currentProfile.socials = socials;
      showToast('Socials saved! 🎉','success');
      updatePreview();
    } catch { showToast('Error saving socials.','error'); }
    finally { btn.disabled=false; btn.textContent='Save Social Links'; }
  });
}

// ── Firestore helper ─────────────────────────────────────────
async function saveField(fields) {
  await updateDoc(doc(db,'users', currentUser.uid), fields);
}

// ── Links (with SortableJS) ───────────────────────────────────
function subscribeLinks() {
  const ref = collection(db,'users',currentUser.uid,'links');
  const q   = query(ref, orderBy('order','asc'));

  const handleSnap = snap => {
    links = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderLinks();
    updatePreview();
  };

  onSnapshot(q, handleSnap, () => {
    onSnapshot(collection(db,'users',currentUser.uid,'links'), snap => {
      links = snap.docs.map(d=>({id:d.id,...d.data()}));
      links.sort((a,b)=>(a.order||0)-(b.order||0));
      renderLinks(); updatePreview();
    });
  });

  $('add-link-btn')?.addEventListener('click', addLink);
}

async function addLink() {
  const titEl = $('link-title-input'), urlEl = $('link-url-input');
  const title = titEl?.value.trim();
  let   url   = urlEl?.value.trim();
  const highlight = $('link-highlight-toggle')?.checked || false;
  if (!title||!url) { showToast('Fill in title and URL.','error'); return; }
  if (!/^https?:\/\//i.test(url)) url='https://'+url;

  const btn=$('add-link-btn');
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span>';
  try {
    await addDoc(collection(db,'users',currentUser.uid,'links'),
      { title, url, clicks:0, order:links.length, highlight, createdAt:new Date().toISOString() });
    titEl.value=''; urlEl.value='';
    if($('link-highlight-toggle')) $('link-highlight-toggle').checked=false;
    showToast('Link added! 🔗','success');
  } catch { showToast('Error adding link.','error'); }
  finally { btn.disabled=false; btn.textContent='+ Add Link'; }
}

function renderLinks() {
  const el = $('links-list'); if (!el) return;
  if (!links.length) {
    el.innerHTML=`<div class="empty-state"><div class="empty-state-icon">🔗</div><p>No links yet. Add your first one!</p></div>`;
    return;
  }
  el.innerHTML = links.map(l=>`
    <div class="link-item" data-id="${l.id}">
      <span class="drag-handle" title="Drag to reorder">⠿</span>
      ${l.highlight ? '<span class="link-hot-dot" title="Highlighted"></span>' : ''}
      <div class="link-item-info">
        <div class="link-item-title">${esc(l.title)}</div>
        <div class="link-item-url">${esc(l.url)}</div>
      </div>
      <div class="link-item-clicks">📊 ${l.clicks||0}</div>
      <div class="link-item-actions">
        <button class="icon-btn" onclick="openEditModal('${l.id}')">✏️</button>
        <button class="icon-btn delete" onclick="deleteLink('${l.id}')">🗑️</button>
      </div>
    </div>`).join('');

  initSortable();
}

function initSortable() {
  if (typeof Sortable==='undefined') return;
  if (sortableInst) sortableInst.destroy();
  sortableInst = Sortable.create($('links-list'), {
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    animation: 160,
    onEnd: saveOrder
  });
}

async function saveOrder() {
  const items = [...document.querySelectorAll('#links-list .link-item')];
  const batch = writeBatch(db);
  items.forEach((el,i) => {
    const id = el.dataset.id;
    batch.update(doc(db,'users',currentUser.uid,'links',id), { order:i });
  });
  try { await batch.commit(); }
  catch { showToast('Reorder save failed.','error'); }
}

// ── Edit Modal ───────────────────────────────────────────────
window.openEditModal = linkId => {
  const link=links.find(l=>l.id===linkId); if(!link) return;
  const ov=document.createElement('div'); ov.className='modal-overlay'; ov.id='edit-modal';
  ov.innerHTML=`<div class="glass-strong modal">
    <div class="modal-header"><span class="modal-title">✏️ Edit Link</span><button class="icon-btn" onclick="closeEditModal()">✕</button></div>
    <div class="modal-form">
      <div class="form-group"><label>Title</label><input id="edit-title" type="text" value="${esc(link.title)}"></div>
      <div class="form-group"><label>URL</label><input id="edit-url" type="url" value="${esc(link.url)}"></div>
      <label class="highlight-row" style="margin:4px 0">
        <span class="toggle-sw"><input type="checkbox" id="edit-highlight" ${link.highlight?'checked':''}><span class="toggle-sl"></span></span>
        ⚡ Highlight this link
      </label>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeEditModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveEditedLink('${linkId}')">Save</button>
      </div>
    </div></div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', e=>{if(e.target===ov) closeEditModal();});
};
window.closeEditModal = () => $('edit-modal')?.remove();
window.saveEditedLink = async linkId => {
  const title=$('edit-title')?.value.trim(); let url=$('edit-url')?.value.trim();
  const highlight = $('edit-highlight')?.checked || false;
  if(!title||!url){showToast('Both fields required.','error');return;}
  if(!/^https?:\/\//i.test(url)) url='https://'+url;
  try {
    await updateDoc(doc(db,'users',currentUser.uid,'links',linkId),{title,url,highlight});
    closeEditModal(); showToast('Updated! ✅','success');
  } catch { showToast('Error.','error'); }
};
window.deleteLink = async linkId => {
  if(!confirm('Delete this link?')) return;
  try { await deleteDoc(doc(db,'users',currentUser.uid,'links',linkId)); showToast('Deleted.','info'); }
  catch { showToast('Error.','error'); }
};

// ── Live Preview ──────────────────────────────────────────────
function updatePreview() {
  const p = currentProfile||{};
  const { username='', displayName='', bio='', avatarStyle='lorelei',
          theme='glass', customBg='', btnShape='soft', btnFill='glass',
          font='Space Grotesk', socials={} } = p;

  // Avatar + text
  setAttr('preview-avatar','src', avatarUrl(username, avatarStyle));
  setText('preview-name', displayName||username||'Your Name');
  setText('preview-bio',  bio||'');

  // Theme background on preview phone
  const phone = $('preview-phone');
  if (phone) {
    const t = THEMES[theme];
    phone.style.background = (theme==='custom' && customBg) ? customBg
      : t ? t.bg.split(',').slice(-1)[0].trim() : '#161616';
    // Accent color
    const accent = (theme==='custom') ? '#a855f7' : (t?.accent||'#a855f7');
    phone.style.setProperty('--p-accent', accent);
  }

  // Social icons in preview
  const socEl = $('preview-soc');
  if (socEl) {
    const activeSocs = SOCIALS.filter(s => socials[s.id]);
    socEl.innerHTML = activeSocs.length
      ? activeSocs.map(s=>`<div class="prev-soc-btn" title="${s.label}">${s.icon.slice(0,2)}</div>`).join('')
      : '';
  }

  // Links with button style + highlight applied
  const linksEl = $('preview-links');
  if (linksEl) {
    const shapeClass = `prev-link-${btnShape}`;
    const fillClass  = `prev-link-${btnFill}`;
    linksEl.innerHTML = links.length
      ? links.map(l=>`
          <div class="preview-link ${shapeClass} ${fillClass} ${l.highlight?'prev-link-hot':''}" style="font-family:'${font}',sans-serif;position:relative">
            ${l.highlight ? '<span style="position:absolute;top:-6px;right:8px;font-size:0.45rem;color:var(--neon-purple);background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.4);border-radius:9999px;padding:1px 5px">HOT</span>' : ''}
            ${esc(l.title)}
          </div>`).join('')
      : `<div style="font-size:.6rem;color:var(--text-muted);text-align:center">Links appear here</div>`;
  }
}
