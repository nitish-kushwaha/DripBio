// ============================================================
// DripBio.bond — Public Profile Page
// ============================================================

import { db } from './firebase-config.js';
import {
  doc, getDoc, collection, getDocs, query, orderBy, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Helpers ──────────────────────────────────────────────────
const show = (id) => { const el = document.getElementById(id); if (el) el.style.display = ''; };
const hide = (id) => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };

// ── Dicebear Avatar ──────────────────────────────────────────
function avatarUrl(seed, style = 'lorelei') {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

// ── Parse username from URL path ─────────────────────────────
// On Netlify: dripbio.bond/neha → pathname = "/neha" → username = "neha"
const rawPath   = window.location.pathname;
const pathParts = rawPath.split('/').filter(Boolean);
const username  = pathParts[0]?.toLowerCase().replace(/\.html$/, '');

// ── Boot ─────────────────────────────────────────────────────
(async () => {
  // Show loading, hide others
  show('profile-loading');
  hide('profile-wrapper');
  hide('profile-not-found');

  // Edge case: root path with no username → redirect to landing
  if (!username) {
    window.location.href = '/';
    return;
  }

  // Skip known app pages
  const appPages = ['login', 'signup', 'dashboard', '404', 'profile', 'index'];
  if (appPages.includes(username)) {
    window.location.href = '/';
    return;
  }

  try {
    // 1. Look up UID from username index
    const usernameDoc = await getDoc(doc(db, 'usernames', username));

    if (!usernameDoc.exists()) {
      hide('profile-loading');
      show('profile-not-found');
      document.title = 'Profile Not Found — DripBio';
      return;
    }

    const uid = usernameDoc.data().uid;

    // 2. Fetch user profile
    const profileSnap = await getDoc(doc(db, 'users', uid));
    if (!profileSnap.exists()) {
      hide('profile-loading');
      show('profile-not-found');
      return;
    }

    const profile = profileSnap.data();

    // 3. Fetch links (with fallback if Firestore index not set)
    let links = [];
    try {
      const q    = query(collection(db, 'users', uid, 'links'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      links = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      const snap = await getDocs(collection(db, 'users', uid, 'links'));
      links = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      links.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    // 4. Render profile
    renderProfile(profile, links, uid);
    hide('profile-loading');
    show('profile-wrapper');

    // 5. Update page meta
    document.title = `${profile.displayName || profile.username} — DripBio`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = profile.bio || `Check out ${profile.displayName || profile.username}'s links on DripBio.`;

  } catch (err) {
    console.error('DripBio profile error:', err);
    hide('profile-loading');
    show('profile-not-found');
  }
})();

// ── Render Profile ───────────────────────────────────────────
function renderProfile(profile, links, uid) {
  const { username: uname, displayName, bio, avatarStyle = 'lorelei' } = profile;
  const escHtml = s => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Avatar
  const avatarEl = document.getElementById('profile-avatar');
  if (avatarEl) {
    avatarEl.src = avatarUrl(uname, avatarStyle);
    avatarEl.alt = displayName || uname;
  }

  // Name & Bio
  const nameEl = document.getElementById('profile-name');
  const bioEl  = document.getElementById('profile-bio');
  if (nameEl) nameEl.textContent = displayName || uname;
  if (bioEl) {
    bioEl.textContent = bio || '';
    bioEl.style.display = bio ? '' : 'none';
  }

  // Links
  const linksEl = document.getElementById('profile-links');
  if (linksEl) {
    if (links.length === 0) {
      linksEl.innerHTML = `
        <div style="color:var(--text-muted);text-align:center;font-size:0.9rem;padding:2rem 0">
          No links yet 🌙
        </div>`;
    } else {
      linksEl.innerHTML = links.map(link => `
        <a
          class="profile-link-btn"
          href="${escHtml(link.url)}"
          target="_blank"
          rel="noopener noreferrer"
          data-link-id="${link.id}"
          data-uid="${uid}"
        >
          <span>${escHtml(link.title)}</span>
        </a>
      `).join('');

      // Click tracking
      linksEl.querySelectorAll('.profile-link-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          // Track non-blocking, don't prevent navigation
          trackClick(uid, btn.dataset.linkId);
        });
      });
    }
  }

  // Share button
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const shareData = {
        title: `${displayName || uname} on DripBio`,
        text:  bio ? `${bio} — check my links!` : `Check out my links!`,
        url:   window.location.href
      };
      if (navigator.share) {
        try { await navigator.share(shareData); } catch { /* user cancelled */ }
      } else {
        try {
          await navigator.clipboard.writeText(window.location.href);
          const orig = shareBtn.innerHTML;
          shareBtn.innerHTML = '✅ Link Copied!';
          setTimeout(() => { shareBtn.innerHTML = orig; }, 2000);
        } catch {
          alert('Copy this link: ' + window.location.href);
        }
      }
    });
  }
}

// ── Click Tracking ───────────────────────────────────────────
async function trackClick(uid, linkId) {
  if (!uid || !linkId) return;
  try {
    await updateDoc(doc(db, 'users', uid, 'links', linkId), {
      clicks: increment(1)
    });
  } catch { /* non-blocking — don't break navigation */ }
}
