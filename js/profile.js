// ============================================================
// DripBio.bond — Public Profile Page
// ============================================================

import { db } from './firebase-config.js';
import {
  doc, getDoc, collection, getDocs, query, orderBy, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Parse username from URL path ─────────────────────────────
// e.g. dripbio.bond/neha → "neha"
const pathParts = window.location.pathname.split('/').filter(Boolean);
const username  = pathParts[0]?.toLowerCase();

// ── Dicebear Avatar ──────────────────────────────────────────
function avatarUrl(seed, style = 'lorelei') {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

// ── Boot ─────────────────────────────────────────────────────
(async () => {
  const wrapper = document.getElementById('profile-wrapper');
  const loading = document.getElementById('profile-loading');
  const notFound = document.getElementById('profile-not-found');

  // Edge case: root path with no username → redirect to landing
  if (!username || username === 'index.html') {
    window.location.href = '/';
    return;
  }

  // Skip known app pages so they don't trigger profile lookup
  const appPages = ['login', 'signup', 'dashboard', '404', 'profile'];
  if (appPages.includes(username)) {
    window.location.href = '/';
    return;
  }

  try {
    // Look up UID from username index
    const usernameDoc = await getDoc(doc(db, 'usernames', username));
    if (!usernameDoc.exists()) {
      loading?.classList.add('hidden');
      notFound?.classList.remove('hidden');
      document.title = 'Profile Not Found — DripBio';
      return;
    }

    const uid = usernameDoc.data().uid;

    // Fetch profile
    const profileSnap = await getDoc(doc(db, 'users', uid));
    if (!profileSnap.exists()) {
      loading?.classList.add('hidden');
      notFound?.classList.remove('hidden');
      return;
    }

    const profile = profileSnap.data();

    // Fetch links
    let links = [];
    try {
      const q    = query(collection(db, 'users', uid, 'links'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      links = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      // Fallback without ordering
      const snap = await getDocs(collection(db, 'users', uid, 'links'));
      links = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      links.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    // Render
    renderProfile(profile, links, uid);
    loading?.classList.add('hidden');
    wrapper?.classList.remove('hidden');

    // Page meta
    document.title = `${profile.displayName || profile.username} — DripBio`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = profile.bio || `Check out ${profile.displayName}'s links on DripBio.`;

  } catch (err) {
    console.error(err);
    loading?.classList.add('hidden');
    notFound?.classList.remove('hidden');
  }
})();

// ── Render Profile ───────────────────────────────────────────
function renderProfile(profile, links, uid) {
  const { username, displayName, bio, avatarStyle = 'lorelei' } = profile;
  const escHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Avatar
  const avatarEl = document.getElementById('profile-avatar');
  if (avatarEl) {
    avatarEl.src = avatarUrl(username, avatarStyle);
    avatarEl.alt = displayName || username;
  }

  // Name & bio
  const nameEl = document.getElementById('profile-name');
  const bioEl  = document.getElementById('profile-bio');
  if (nameEl) nameEl.textContent = displayName || username;
  if (bioEl)  bioEl.textContent  = bio || '';
  if (bioEl && !bio) bioEl.style.display = 'none';

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
          id="link-${link.id}"
        >
          <span>${escHtml(link.title)}</span>
        </a>
      `).join('');

      // Attach click-tracking handlers
      linksEl.querySelectorAll('.profile-link-btn').forEach(btn => {
        btn.addEventListener('click', () => trackClick(uid, btn.dataset.linkId));
      });
    }
  }

  // Share button
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const shareData = {
        title: `${displayName || username} on DripBio`,
        text:  `Check out my links! ${bio ? '— ' + bio : ''}`,
        url:   window.location.href
      };
      if (navigator.share) {
        try { await navigator.share(shareData); }
        catch { /* user cancelled */ }
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showCopiedFeedback(shareBtn);
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
  } catch { /* non-blocking */ }
}

// ── Share Fallback Feedback ──────────────────────────────────
function showCopiedFeedback(btn) {
  const original = btn.innerHTML;
  btn.innerHTML = '✅ Link Copied!';
  setTimeout(() => { btn.innerHTML = original; }, 2000);
}
