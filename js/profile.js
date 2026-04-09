// ============================================================
// DripBio.bond — Public Profile Page (v2: Themes, Fonts, Buttons, Socials)
// ============================================================

import { db } from './firebase-config.js';
import {
  doc, getDoc, collection, getDocs, query, orderBy, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Themes (mirrors dashboard.js) ────────────────────────────
const THEMES = {
  glass:     { bg: 'radial-gradient(ellipse at 50% 0%,rgba(168,85,247,.14) 0%,transparent 55%),#0f0f0f', accent: '#a855f7' },
  midnight:  { bg: 'radial-gradient(ellipse at 50% 0%,rgba(124,58,237,.22) 0%,transparent 60%),#07031a', accent: '#7c3aed' },
  cyberpunk: { bg: 'radial-gradient(ellipse at 30% 20%,rgba(236,72,153,.16) 0%,transparent 50%),radial-gradient(ellipse at 70% 80%,rgba(6,182,212,.13) 0%,transparent 50%),#0d0d0d', accent: '#ec4899' },
  sunset:    { bg: 'radial-gradient(ellipse at 50% 0%,rgba(249,115,22,.18) 0%,transparent 55%),radial-gradient(ellipse at 80% 100%,rgba(168,85,247,.1) 0%,transparent 50%),#120800', accent: '#f97316' },
  forest:    { bg: 'radial-gradient(ellipse at 50% 0%,rgba(34,197,94,.15) 0%,transparent 55%),#040e07', accent: '#22c55e' },
};

// ── Social icon SVGs ─────────────────────────────────────────
const SOC_SVGS = {
  instagram: `<svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
  twitter:   `<svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  github:    `<svg viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
  linkedin:  `<svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  youtube:   `<svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
};

// ── Helpers ──────────────────────────────────────────────────
const show = id => { const e=document.getElementById(id); if(e) e.style.display=''; };
const hide = id => { const e=document.getElementById(id); if(e) e.style.display='none'; };
const esc  = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const avatarUrl = (seed, style='lorelei') =>
  `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;

// ── Parse username from URL ───────────────────────────────────
const username = window.location.pathname.split('/').filter(Boolean)[0]?.toLowerCase().replace(/\.html$/,'');

// ── Boot ─────────────────────────────────────────────────────
(async () => {
  show('profile-loading'); hide('profile-wrapper'); hide('profile-not-found');

  if (!username) { window.location.href='/'; return; }

  const appPages = ['login','signup','dashboard','404','profile','index'];
  if (appPages.includes(username)) { window.location.href='/'; return; }

  try {
    const usernameDoc = await getDoc(doc(db,'usernames',username));
    if (!usernameDoc.exists()) {
      hide('profile-loading'); show('profile-not-found');
      document.title = 'Not Found — DripBio'; return;
    }

    const uid = usernameDoc.data().uid;
    const profileSnap = await getDoc(doc(db,'users',uid));
    if (!profileSnap.exists()) { hide('profile-loading'); show('profile-not-found'); return; }

    const profile = profileSnap.data();

    // Fetch links
    let links = [];
    try {
      const snap = await getDocs(query(collection(db,'users',uid,'links'), orderBy('order','asc')));
      links = snap.docs.map(d=>({id:d.id,...d.data()}));
    } catch {
      const snap = await getDocs(collection(db,'users',uid,'links'));
      links = snap.docs.map(d=>({id:d.id,...d.data()}));
      links.sort((a,b)=>(a.order||0)-(b.order||0));
    }

    applySettings(profile);
    renderProfile(profile, links, uid);
    hide('profile-loading'); show('profile-wrapper');

    document.title = `${profile.displayName||profile.username} — DripBio`;
    const md = document.querySelector('meta[name="description"]');
    if (md) md.content = profile.bio || `Check out ${profile.displayName||profile.username}'s links on DripBio.`;

  } catch (err) {
    console.error('DripBio profile error:', err);
    hide('profile-loading'); show('profile-not-found');
  }
})();

// ── Apply Theme / Font / Button Settings ──────────────────────
function applySettings(profile) {
  const { theme='glass', customBg='', font='Space Grotesk', btnShape='soft', btnFill='glass' } = profile;

  // Background
  const t = THEMES[theme];
  document.body.style.background = (theme==='custom' && customBg) ? customBg
    : t ? t.bg : THEMES.glass.bg;

  // Accent color CSS var
  const accent = (theme==='custom') ? '#a855f7' : (t?.accent||'#a855f7');
  document.documentElement.style.setProperty('--p-accent', accent);
  document.documentElement.style.setProperty('--neon-purple', accent);

  // Profile avatar border matches accent
  const av = document.getElementById('profile-avatar');
  if (av) av.style.borderColor = accent;

  // Font — load from Google Fonts + apply
  const fontSlug = font.replace(/ /g,'+');
  const lnk = document.createElement('link');
  lnk.rel='stylesheet';
  lnk.href=`https://fonts.googleapis.com/css2?family=${fontSlug}:wght@400;600;700&display=swap`;
  document.head.appendChild(lnk);
  document.body.style.setProperty('--profile-font', `'${font}',sans-serif`);

  // Button shape + fill via data attrs on wrapper
  const wrapper = document.getElementById('profile-wrapper');
  if (wrapper) {
    wrapper.setAttribute('data-btn-shape', btnShape);
    wrapper.setAttribute('data-btn-fill',  btnFill);
  }
}

// ── Render Profile ────────────────────────────────────────────
function renderProfile(profile, links, uid) {
  const { username:uname, displayName, bio, avatarStyle='lorelei', socials={} } = profile;

  // Avatar
  const av = document.getElementById('profile-avatar');
  if (av) { av.src = avatarUrl(uname, avatarStyle); av.alt = displayName||uname; }

  // Name & Bio
  const nameEl = document.getElementById('profile-name');
  const bioEl  = document.getElementById('profile-bio');
  if (nameEl) nameEl.textContent = displayName||uname;
  if (bioEl)  { bioEl.textContent = bio||''; bioEl.style.display = bio ? '' : 'none'; }

  // Social icons bar
  const socBar = document.getElementById('social-bar');
  if (socBar) {
    const activeSocs = Object.entries(socials).filter(([,v])=>v);
    socBar.innerHTML = activeSocs.length
      ? activeSocs.map(([key, url]) => SOC_SVGS[key]
          ? `<a class="soc-btn" href="${esc(url)}" target="_blank" rel="noopener" title="${key}">${SOC_SVGS[key]}</a>`
          : '').join('')
      : '';
  }

  // Links
  const linksEl = document.getElementById('profile-links');
  if (linksEl) {
    if (!links.length) {
      linksEl.innerHTML=`<div style="color:var(--text-muted);text-align:center;font-size:.9rem;padding:2rem 0">No links yet 🌙</div>`;
    } else {
      linksEl.innerHTML = links.map(l=>`
        <a class="profile-link-btn" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"
           data-link-id="${l.id}" data-uid="${uid}">
          <span>${esc(l.title)}</span>
        </a>`).join('');

      linksEl.querySelectorAll('.profile-link-btn').forEach(btn => {
        btn.addEventListener('click', () => trackClick(uid, btn.dataset.linkId));
      });
    }
  }

  // Share button
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const data = { title:`${displayName||uname} on DripBio`, text: bio||'Check out my links!', url: location.href };
      if (navigator.share) { try{await navigator.share(data);}catch{} }
      else {
        try { await navigator.clipboard.writeText(location.href); }
        catch { alert('Copy: '+location.href); }
        const orig=shareBtn.innerHTML;
        shareBtn.innerHTML='✅ Copied!';
        setTimeout(()=>{shareBtn.innerHTML=orig;},2000);
      }
    });
  }
}

// ── Click Tracking ────────────────────────────────────────────
async function trackClick(uid, linkId) {
  if (!uid||!linkId) return;
  try { await updateDoc(doc(db,'users',uid,'links',linkId),{clicks:increment(1)}); }
  catch { /* non-blocking */ }
}
