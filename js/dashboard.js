// ============================================================
// DripBio.bond — Dashboard (v3: 25 Themes, Full Customization)
// ============================================================

import { auth, db } from './firebase-config.js';
import { requireAuth, getUserProfile, showToast, logOut, resendVerificationEmail } from './auth.js';
import {
  doc, updateDoc, collection, addDoc, deleteDoc,
  onSnapshot, query, orderBy, writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── 25 Themes ────────────────────────────────────────────────
const THEMES = {
  // ── Original 5 ──
  glass:       { bg: 'radial-gradient(ellipse at 50% 0%,rgba(168,85,247,.14) 0%,transparent 55%),#0f0f0f',              accent: '#a855f7', text: '#f1f5f9', name: 'Glass',        emoji: '🔮', animated: false },
  midnight:    { bg: 'radial-gradient(ellipse at 50% 0%,rgba(124,58,237,.22) 0%,transparent 60%),#07031a',              accent: '#7c3aed', text: '#e2d9f3', name: 'Midnight',     emoji: '🌙', animated: false },
  cyberpunk:   { bg: 'radial-gradient(ellipse at 30% 20%,rgba(236,72,153,.16) 0%,transparent 50%),radial-gradient(ellipse at 70% 80%,rgba(6,182,212,.13) 0%,transparent 50%),#0d0d0d', accent: '#ec4899', text: '#f0f9ff', name: 'Cyber',        emoji: '⚡', animated: false },
  sunset:      { bg: 'radial-gradient(ellipse at 50% 0%,rgba(249,115,22,.18) 0%,transparent 55%),radial-gradient(ellipse at 80% 100%,rgba(168,85,247,.1) 0%,transparent 50%),#120800', accent: '#f97316', text: '#fff7ed', name: 'Sunset',       emoji: '🌅', animated: false },
  forest:      { bg: 'radial-gradient(ellipse at 50% 0%,rgba(34,197,94,.15) 0%,transparent 55%),#040e07',               accent: '#22c55e', text: '#f0fdf4', name: 'Forest',       emoji: '🌿', animated: false },

  // ── New 20 ──
  ocean:       { bg: 'radial-gradient(ellipse at 50% 0%,rgba(6,182,212,.2) 0%,transparent 60%),radial-gradient(ellipse at 20% 80%,rgba(59,130,246,.15) 0%,transparent 50%),#030d18', accent: '#06b6d4', text: '#e0f7ff', name: 'Ocean',        emoji: '🌊', animated: false },
  rosegold:    { bg: 'radial-gradient(ellipse at 40% 0%,rgba(251,191,36,.1) 0%,transparent 50%),radial-gradient(ellipse at 70% 80%,rgba(236,72,153,.15) 0%,transparent 50%),#1a0a0f', accent: '#f59e0b', text: '#fdf2f8', name: 'Rose Gold',    emoji: '🌹', animated: false },
  arctic:      { bg: 'radial-gradient(ellipse at 50% 30%,rgba(148,163,184,.12) 0%,transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(186,230,253,.08) 0%,transparent 50%),#0c1220', accent: '#bae6fd', text: '#f0f9ff', name: 'Arctic',       emoji: '❄️', animated: false },
  volcanic:    { bg: 'radial-gradient(ellipse at 50% 100%,rgba(239,68,68,.25) 0%,transparent 60%),radial-gradient(ellipse at 50% 0%,rgba(251,146,60,.12) 0%,transparent 50%),#0f0000', accent: '#ef4444', text: '#fff1f2', name: 'Volcanic',     emoji: '🌋', animated: false },
  galaxy:      { bg: 'radial-gradient(ellipse at 20% 30%,rgba(124,58,237,.2) 0%,transparent 50%),radial-gradient(ellipse at 80% 70%,rgba(6,182,212,.15) 0%,transparent 50%),radial-gradient(ellipse at 50% 50%,rgba(236,72,153,.08) 0%,transparent 60%),#020209', accent: '#818cf8', text: '#eef2ff', name: 'Galaxy',       emoji: '🌌', animated: false },
  neonnoir:    { bg: 'radial-gradient(ellipse at 30% 50%,rgba(16,185,129,.14) 0%,transparent 55%),#010101',             accent: '#10b981', text: '#ecfdf5', name: 'Neon Noir',    emoji: '🕵️', animated: false },
  candypop:    { bg: 'radial-gradient(ellipse at 40% 0%,rgba(244,114,182,.2) 0%,transparent 55%),radial-gradient(ellipse at 70% 80%,rgba(129,140,248,.15) 0%,transparent 50%),#0d001a', accent: '#f472b6', text: '#fdf4ff', name: 'Candy Pop',   emoji: '🍭', animated: false },
  desert:      { bg: 'radial-gradient(ellipse at 50% 0%,rgba(217,119,6,.18) 0%,transparent 55%),radial-gradient(ellipse at 80% 90%,rgba(180,83,9,.1) 0%,transparent 50%),#130900',    accent: '#d97706', text: '#fffbeb', name: 'Desert',       emoji: '🏜️', animated: false },
  sakura:      { bg: 'radial-gradient(ellipse at 50% 0%,rgba(251,207,232,.18) 0%,transparent 55%),radial-gradient(ellipse at 20% 80%,rgba(244,114,182,.12) 0%,transparent 50%),#1a0010', accent: '#fb7185', text: '#fdf2f8', name: 'Sakura',       emoji: '🌸', animated: false },
  matrix:      { bg: 'radial-gradient(ellipse at 50% 50%,rgba(0,255,65,.06) 0%,transparent 70%),#000100',               accent: '#00ff41', text: '#bbf7d0', name: 'Matrix',       emoji: '💻', animated: false },
  retrowave:   { bg: 'linear-gradient(180deg,#0d0030 0%,#1a0040 40%,#2d0060 70%,#1a0030 100%)',                        accent: '#ff00ff', text: '#fdf4ff', name: 'Retro Wave',   emoji: '🕹️', animated: false },
  holographic: { bg: 'linear-gradient(135deg,#0a0010,#001020,#001008,#100010)',                                          accent: '#a5f3fc', text: '#f0fdff', name: 'Holo',         emoji: '✨', animated: true  },
  coffee:      { bg: 'radial-gradient(ellipse at 50% 0%,rgba(120,53,15,.3) 0%,transparent 55%),#0d0700',               accent: '#92400e', text: '#fef3c7', name: 'Coffee',       emoji: '☕', animated: false },
  electric:    { bg: 'radial-gradient(ellipse at 50% 0%,rgba(37,99,235,.22) 0%,transparent 55%),radial-gradient(ellipse at 80% 80%,rgba(6,182,212,.1) 0%,transparent 50%),#00010f',  accent: '#3b82f6', text: '#eff6ff', name: 'Electric',     emoji: '⚡', animated: false },
  velvet:      { bg: 'radial-gradient(ellipse at 50% 0%,rgba(109,40,217,.25) 0%,transparent 55%),radial-gradient(ellipse at 20% 100%,rgba(124,58,237,.15) 0%,transparent 50%),#0a0010', accent: '#8b5cf6', text: '#f5f3ff', name: 'Velvet',       emoji: '💜', animated: false },
  bloodmoon:   { bg: 'radial-gradient(ellipse at 50% 0%,rgba(127,0,0,.28) 0%,transparent 55%),radial-gradient(ellipse at 80% 100%,rgba(185,28,28,.1) 0%,transparent 50%),#0a0000',   accent: '#dc2626', text: '#fff1f2', name: 'Blood Moon',  emoji: '🩸', animated: false },
  aurora:      { bg: 'linear-gradient(160deg,#020b18 0%,#051f1a 35%,#0e1a2e 65%,#120520 100%)',                        accent: '#34d399', text: '#ecfdf5', name: 'Aurora',       emoji: '🌌', animated: true  },
  goldrush:    { bg: 'radial-gradient(ellipse at 50% 0%,rgba(234,179,8,.14) 0%,transparent 55%),radial-gradient(ellipse at 80% 80%,rgba(161,98,7,.1) 0%,transparent 50%),#0a0700',   accent: '#eab308', text: '#fefce8', name: 'Gold Rush',   emoji: '🥇', animated: false },
  strawberry:  { bg: 'radial-gradient(ellipse at 50% 0%,rgba(225,29,72,.2) 0%,transparent 55%),radial-gradient(ellipse at 20% 80%,rgba(249,168,212,.1) 0%,transparent 50%),#110007', accent: '#e11d48', text: '#fff1f2', name: 'Strawberry',  emoji: '🍓', animated: false },
  mint:        { bg: 'radial-gradient(ellipse at 50% 0%,rgba(16,185,129,.14) 0%,transparent 55%),radial-gradient(ellipse at 80% 80%,rgba(6,182,212,.08) 0%,transparent 50%),#011008', accent: '#10b981', text: '#ecfdf5', name: 'Mint',         emoji: '🌿', animated: false },
};

const FONTS = [
  { name: 'Space Grotesk',  label: 'Space Grotesk',  category: 'Tech' },
  { name: 'Outfit',         label: 'Outfit',          category: 'Clean' },
  { name: 'Bangers',        label: 'Bangers',         category: 'Bold' },
  { name: 'Pacifico',       label: 'Pacifico',        category: 'Fun' },
  { name: 'Inter',          label: 'Inter',           category: 'Modern' },
  { name: 'Poppins',        label: 'Poppins',         category: 'Soft' },
  { name: 'Playfair Display', label: 'Playfair',      category: 'Elegant' },
  { name: 'Roboto Mono',    label: 'Roboto Mono',     category: 'Code' },
  { name: 'Bebas Neue',     label: 'Bebas Neue',      category: 'Display' },
  { name: 'Dancing Script', label: 'Dancing Script',  category: 'Script' },
  { name: 'Rajdhani',       label: 'Rajdhani',        category: 'Futuristic' },
  { name: 'Permanent Marker', label: 'Marker',        category: 'Handwritten' },
];

const SOCIALS = [
  { id: 'instagram', label: 'Instagram',   icon: '📸' },
  { id: 'twitter',   label: 'X / Twitter', icon: '𝕏'  },
  { id: 'github',    label: 'GitHub',      icon: '🐙' },
  { id: 'linkedin',  label: 'LinkedIn',    icon: '💼' },
  { id: 'youtube',   label: 'YouTube',     icon: '▶️' },
  { id: 'tiktok',    label: 'TikTok',      icon: '🎵' },
  { id: 'snapchat',  label: 'Snapchat',    icon: '👻' },
  { id: 'discord',   label: 'Discord',     icon: '🎮' },
];

// ── Layout Options ────────────────────────────────────────────
const LAYOUTS = [
  { key: 'centered', label: 'Centered',    icon: '▣' },
  { key: 'left',     label: 'Left Align',  icon: '◧' },
  { key: 'card',     label: 'Card',        icon: '🃏' },
  { key: 'minimal',  label: 'Minimal',     icon: '—'  },
];

const AVATAR_SHAPES = [
  { key: 'circle',   label: 'Circle'   },
  { key: 'square',   label: 'Square'   },
  { key: 'rounded',  label: 'Rounded'  },
  { key: 'hexagon',  label: 'Hexagon'  },
];

const SPACINGS = [
  { key: 'compact',  label: 'Compact'  },
  { key: 'normal',   label: 'Normal'   },
  { key: 'spacious', label: 'Spacious' },
];

const PAGE_EFFECTS = [
  { key: 'none',      label: 'None',       icon: '✕' },
  { key: 'particles', label: 'Particles',  icon: '✦' },
  { key: 'aurora',    label: 'Aurora',     icon: '🌌' },
  { key: 'grid',      label: 'Grid',       icon: '⊞' },
  { key: 'stars',     label: 'Stars',      icon: '⭐' },
];

// ── State ────────────────────────────────────────────────────
let currentUser    = null;
let currentProfile = null;
let links          = [];
let sortableInst   = null;

// ── Helpers ──────────────────────────────────────────────────
const $       = id => document.getElementById(id);
const setVal  = (id, v) => { const e=$(id); if(e) e.value=v; };
const setAttr = (id, a, v) => { const e=$(id); if(e) e.setAttribute(a,v); };
const setText = (id, v) => { const e=$(id); if(e) e.textContent=v; };
const esc     = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const avatarUrl = (seed, style='lorelei') =>
  `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;

// ── Bootstrap ────────────────────────────────────────────────
requireAuth(async user => {
  currentUser = user;

  try { await user.reload(); } catch {}
  const freshUser = auth.currentUser || user;
  if (!freshUser.emailVerified) { window.location.href='/email-sent.html'; return; }

  try {
    currentProfile = await getUserProfile(user.uid);
    if (!currentProfile || currentProfile.isVerified !== true) {
      window.location.href='/verify-complete.html'; return;
    }
  } catch (e) { console.error(e); window.location.href='/verify-complete.html'; return; }

  if (currentProfile.isAdmin === true) {
    const adminBtn = document.getElementById('admin-panel-btn');
    if (adminBtn) adminBtn.style.display = 'inline-flex';
  }
  bootstrapNavbar();
  bootstrapProfile();
  bootstrapCustomize();
  subscribeLinks();
});

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
  $('tab-btn-profile')?.addEventListener('click', () => switchTab('profile'));
  $('tab-btn-customize')?.addEventListener('click', () => switchTab('customize'));

  initThemePicker();
  initFontPicker();
  initBtnPickers();
  initLayoutPicker();
  initAvatarShapePicker();
  initSpacingPicker();
  initPageEffectPicker();
  initColorPickers();
  initWidthPicker();
  initCustomCss();
  initSocialForm();
}

function switchTab(name) {
  $('tab-profile').style.display   = name==='profile'   ? '' : 'none';
  $('tab-customize').style.display = name==='customize' ? '' : 'none';
  $('tab-btn-profile').classList.toggle('active', name==='profile');
  $('tab-btn-customize').classList.toggle('active', name==='customize');
}

// ── Theme Picker (scrollable grid, 25 themes) ─────────────────
function initThemePicker() {
  const grid = $('theme-grid'); if (!grid) return;
  const cur = currentProfile.theme || 'glass';

  Object.entries(THEMES).forEach(([key, t]) => {
    const wrap = document.createElement('div');
    wrap.className = 'theme-swatch-wrap';
    const sw = document.createElement('div');
    sw.className = 'theme-swatch' + (key===cur ? ' active' : '');
    sw.style.background = t.bg;
    sw.title = t.name;
    sw.innerHTML = `<span class="theme-emoji">${t.emoji}</span>${t.animated ? '<span class="theme-anim-dot"></span>' : ''}`;
    sw.addEventListener('click', async () => {
      document.querySelectorAll('.theme-swatch').forEach(s=>s.classList.remove('active'));
      sw.classList.add('active');
      currentProfile.theme = key;
      await saveField({ theme: key, customBg: '' });
      updatePreview();
      showToast(`Theme: ${t.name} ${t.emoji}`, 'success');
    });
    const nm = document.createElement('div');
    nm.className='theme-swatch-name'; nm.textContent=t.name;
    wrap.appendChild(sw); wrap.appendChild(nm);
    grid.appendChild(wrap);
  });

  // Custom BG color
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

// ── Font Picker (12 fonts with Google Fonts preload) ─────────
function initFontPicker() {
  const container = $('font-picker'); if (!container) return;
  const cur = currentProfile.font || 'Space Grotesk';

  // Preload all fonts
  const fontList = FONTS.map(f=>f.name.replace(/ /g,'+')+':wght@400;600;700').join('&family=');
  const link = document.createElement('link');
  link.rel='stylesheet';
  link.href=`https://fonts.googleapis.com/css2?family=${fontList}&display=swap`;
  document.head.appendChild(link);

  FONTS.forEach(f => {
    const btn = document.createElement('div');
    btn.className = 'font-opt' + (f.name===cur ? ' active' : '');
    btn.innerHTML = `<span style="font-family:'${f.name}',sans-serif;font-size:1rem">${f.label}</span><span class="font-cat">${f.category}</span><span class="tick">${f.name===cur?'✓':''}</span>`;
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

// ── Button Pickers ────────────────────────────────────────────
function initBtnPickers() {
  const curShape = currentProfile.btnShape||'soft';
  const curFill  = currentProfile.btnFill||'glass';
  const curSize  = currentProfile.btnSize||'medium';

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

  document.querySelectorAll('#btn-size-picker .pick-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size===curSize);
    btn.addEventListener('click', async () => {
      document.querySelectorAll('#btn-size-picker .pick-opt').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentProfile.btnSize = btn.dataset.size;
      await saveField({ btnSize: btn.dataset.size });
      updatePreview();
    });
  });
}

// ── Layout Picker ─────────────────────────────────────────────
function initLayoutPicker() {
  const picker = $('layout-picker'); if (!picker) return;
  const cur = currentProfile.layout || 'centered';

  LAYOUTS.forEach(l => {
    const btn = document.createElement('button');
    btn.className = 'pick-opt' + (l.key===cur ? ' active' : '');
    btn.dataset.layout = l.key;
    btn.innerHTML = `<span style="font-size:1rem">${l.icon}</span><span>${l.label}</span>`;
    btn.addEventListener('click', async () => {
      picker.querySelectorAll('.pick-opt').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentProfile.layout = l.key;
      await saveField({ layout: l.key });
      updatePreview();
      showToast(`Layout: ${l.label}`, 'success');
    });
    picker.appendChild(btn);
  });
}

// ── Avatar Shape Picker ───────────────────────────────────────
function initAvatarShapePicker() {
  const picker = $('avatar-shape-picker'); if (!picker) return;
  const cur = currentProfile.avatarShape || 'circle';

  AVATAR_SHAPES.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'pick-opt' + (s.key===cur ? ' active' : '');
    btn.dataset.shape = s.key;
    btn.textContent = s.label;
    btn.addEventListener('click', async () => {
      picker.querySelectorAll('.pick-opt').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentProfile.avatarShape = s.key;
      await saveField({ avatarShape: s.key });
      updatePreview();
    });
    picker.appendChild(btn);
  });
}

// ── Spacing Picker ────────────────────────────────────────────
function initSpacingPicker() {
  const picker = $('spacing-picker'); if (!picker) return;
  const cur = currentProfile.spacing || 'normal';

  SPACINGS.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'pick-opt' + (s.key===cur ? ' active' : '');
    btn.dataset.spacing = s.key;
    btn.textContent = s.label;
    btn.addEventListener('click', async () => {
      picker.querySelectorAll('.pick-opt').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentProfile.spacing = s.key;
      await saveField({ spacing: s.key });
      updatePreview();
    });
    picker.appendChild(btn);
  });
}

// ── Page Effect Picker ────────────────────────────────────────
function initPageEffectPicker() {
  const picker = $('effect-picker'); if (!picker) return;
  const cur = currentProfile.pageEffect || 'none';

  PAGE_EFFECTS.forEach(e => {
    const btn = document.createElement('button');
    btn.className = 'pick-opt' + (e.key===cur ? ' active' : '');
    btn.dataset.effect = e.key;
    btn.innerHTML = `<span>${e.icon}</span> ${e.label}`;
    btn.addEventListener('click', async () => {
      picker.querySelectorAll('.pick-opt').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentProfile.pageEffect = e.key;
      await saveField({ pageEffect: e.key });
      updatePreview();
    });
    picker.appendChild(btn);
  });
}

// ── Color Pickers (accent + text) ────────────────────────────
function initColorPickers() {
  const accentInput = $('custom-accent-input');
  const textInput   = $('custom-text-input');
  if (accentInput) {
    if (currentProfile.customAccent) accentInput.value = currentProfile.customAccent;
    let d;
    accentInput.addEventListener('input', () => {
      clearTimeout(d);
      d = setTimeout(async () => {
        currentProfile.customAccent = accentInput.value;
        await saveField({ customAccent: accentInput.value });
        updatePreview();
      }, 400);
    });
  }
  if (textInput) {
    if (currentProfile.customTextColor) textInput.value = currentProfile.customTextColor;
    let d;
    textInput.addEventListener('input', () => {
      clearTimeout(d);
      d = setTimeout(async () => {
        currentProfile.customTextColor = textInput.value;
        await saveField({ customTextColor: textInput.value });
        updatePreview();
      }, 400);
    });
  }
}

// ── Card Width Picker ─────────────────────────────────────────
function initWidthPicker() {
  const cur = currentProfile.cardWidth || 'medium';
  document.querySelectorAll('#width-picker .pick-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.width===cur);
    btn.addEventListener('click', async () => {
      document.querySelectorAll('#width-picker .pick-opt').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentProfile.cardWidth = btn.dataset.width;
      await saveField({ cardWidth: btn.dataset.width });
      updatePreview();
    });
  });
}

// ── Custom CSS ────────────────────────────────────────────────
function initCustomCss() {
  const textarea = $('custom-css-input'); if (!textarea) return;
  if (currentProfile.customCss) textarea.value = currentProfile.customCss;
  let d;
  textarea.addEventListener('input', () => {
    clearTimeout(d);
    d = setTimeout(async () => {
      currentProfile.customCss = textarea.value;
      await saveField({ customCss: textarea.value });
      updatePreview();
    }, 800);
  });
}

// ── Social Links Form ─────────────────────────────────────────
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
    renderLinks(); updatePreview();
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
  const {
    username='', displayName='', bio='', avatarStyle='lorelei',
    theme='glass', customBg='', btnShape='soft', btnFill='glass', btnSize='medium',
    font='Space Grotesk', socials={}, layout='centered', avatarShape='circle',
    spacing='normal', customAccent='', customTextColor='', cardWidth='medium',
    pageEffect='none'
  } = p;

  // Avatar + text
  setAttr('preview-avatar','src', avatarUrl(username, avatarStyle));
  setText('preview-name', displayName||username||'Your Name');
  setText('preview-bio',  bio||'');

  // Theme background on preview phone
  const phone = $('preview-phone');
  if (phone) {
    const t = THEMES[theme];
    const bg = (theme==='custom' && customBg) ? customBg
      : t ? t.bg.split(',').slice(-1)[0].trim() : '#161616';
    phone.style.background = bg;

    const accent = customAccent || (theme==='custom' ? '#a855f7' : (t?.accent||'#a855f7'));
    const textColor = customTextColor || (t?.text || '#f1f5f9');
    phone.style.setProperty('--p-accent', accent);
    phone.style.setProperty('--p-text', textColor);
    phone.style.color = textColor;

    // Layout class
    phone.dataset.layout = layout;
    // Avatar shape
    const avEl = $('preview-avatar');
    if (avEl) avEl.dataset.shape = avatarShape;
    // Spacing
    phone.dataset.spacing = spacing;
    // Effect indicator
    phone.dataset.effect = pageEffect;
    // Card width
    phone.dataset.cardWidth = cardWidth;
  }

  // Social icons in preview
  const socEl = $('preview-soc');
  if (socEl) {
    const activeSocs = SOCIALS.filter(s => socials[s.id]);
    socEl.innerHTML = activeSocs.length
      ? activeSocs.map(s=>`<div class="prev-soc-btn" title="${s.label}">${s.icon.slice(0,2)}</div>`).join('')
      : '';
  }

  // Links with full style
  const linksEl = $('preview-links');
  if (linksEl) {
    const shapeClass = `prev-link-${btnShape}`;
    const fillClass  = `prev-link-${btnFill}`;
    const sizeClass  = `prev-link-${btnSize}`;
    linksEl.innerHTML = links.length
      ? links.map(l=>`
          <div class="preview-link ${shapeClass} ${fillClass} ${sizeClass} ${l.highlight?'prev-link-hot':''}" style="font-family:'${font}',sans-serif;position:relative">
            ${l.highlight ? '<span style="position:absolute;top:-6px;right:8px;font-size:0.45rem;color:var(--p-accent,var(--neon-purple));background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.4);border-radius:9999px;padding:1px 5px">HOT</span>' : ''}
            ${esc(l.title)}
          </div>`).join('')
      : `<div style="font-size:.6rem;color:var(--text-muted);text-align:center">Links appear here</div>`;
  }
}
