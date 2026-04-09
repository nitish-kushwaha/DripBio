// ============================================================
// DripBio.bond — Dashboard Logic
// ============================================================

import { auth, db } from './firebase-config.js';
import { requireAuth, getUserProfile, showToast, logOut } from './auth.js';
import {
  doc, updateDoc, collection, addDoc, deleteDoc,
  onSnapshot, query, orderBy, increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser    = null;
let currentProfile = null;
let links          = [];

// ── Dicebear Avatar ─────────────────────────────────────────
function avatarUrl(seed, style = 'lorelei') {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

// ── Helpers ──────────────────────────────────────────────────
const $  = (id) => document.getElementById(id);
const setVal  = (id, v) => { const el = $(id); if (el) el.value = v; };
const setAttr = (id, a, v) => { const el = $(id); if (el) el.setAttribute(a, v); };
const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };
const escHtml = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ── Bootstrap ────────────────────────────────────────────────
requireAuth(async (user) => {
  currentUser    = user;
  try {
    currentProfile = await getUserProfile(user.uid);
  } catch (err) {
    console.error('DripBio: Failed to load profile', err);
    showToast('Could not load profile. Check Firestore rules.', 'error');
    return;
  }

  if (!currentProfile) {
    showToast('Profile not found. Please sign up again.', 'error');
    return;
  }

  bootstrapNavbar();
  bootstrapProfilePanel();
  subscribeLinks();
});

// ── Navbar ───────────────────────────────────────────────────
function bootstrapNavbar() {
  const { username, avatarStyle = 'lorelei' } = currentProfile;

  setText('user-pill-name', '@' + username);
  setAttr('user-pill-avatar', 'src', avatarUrl(username, avatarStyle));
  setAttr('user-pill-avatar', 'alt', username);

  $('logout-btn')?.addEventListener('click', async () => {
    await logOut();
    window.location.href = '/login.html';
  });

  $('copy-link-btn')?.addEventListener('click', () => {
    const link = `${window.location.origin}/${currentProfile.username}`;
    navigator.clipboard.writeText(link).then(() => showToast('Link copied! 🔗', 'success'));
  });

  // Profile URL display
  setText('profile-url-display', `${window.location.hostname}/${username}`);

  // View Public Page button
  const viewBtn = $('view-public-btn');
  if (viewBtn) viewBtn.href = `/${username}`;
}

// ── Profile Panel ────────────────────────────────────────────
function bootstrapProfilePanel() {
  const { displayName, bio, username, avatarStyle = 'lorelei' } = currentProfile;

  setVal('display-name-input', displayName || '');
  setVal('bio-input', bio || '');
  setAttr('profile-avatar-img', 'src', avatarUrl(username, avatarStyle));

  // Avatar style picker
  document.querySelectorAll('.avatar-style-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.style === avatarStyle);
    btn.addEventListener('click', () => pickAvatarStyle(btn.dataset.style));
  });

  $('save-profile-btn')?.addEventListener('click', saveProfile);
  updatePreview();
}

async function pickAvatarStyle(style) {
  currentProfile.avatarStyle = style;
  document.querySelectorAll('.avatar-style-btn').forEach(b => b.classList.toggle('active', b.dataset.style === style));
  const url = avatarUrl(currentProfile.username, style);
  setAttr('profile-avatar-img', 'src', url);
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), { avatarStyle: style });
    updatePreview();
  } catch { showToast('Could not save avatar.', 'error'); }
}

async function saveProfile() {
  const displayName = $('display-name-input')?.value.trim();
  const bio         = $('bio-input')?.value.trim();

  if (!displayName) { showToast('Display name cannot be empty!', 'error'); return; }

  const btn = $('save-profile-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…';

  try {
    await updateDoc(doc(db, 'users', currentUser.uid), { displayName, bio });
    currentProfile.displayName = displayName;
    currentProfile.bio = bio;
    showToast('Profile updated! ✨', 'success');
    updatePreview();
  } catch { showToast('Error saving profile.', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Save Profile'; }
}

// ── Links CRUD ───────────────────────────────────────────────
function subscribeLinks() {
  const ref = collection(db, 'users', currentUser.uid, 'links');
  const q   = query(ref, orderBy('order', 'asc'));

  const render = (snap) => {
    links = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLinks();
    updatePreview();
  };

  // Try ordered query; fallback if composite index missing
  const unsub = onSnapshot(q, render, () => {
    onSnapshot(collection(db, 'users', currentUser.uid, 'links'), (snap) => {
      links = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      links.sort((a, b) => (a.order || 0) - (b.order || 0));
      renderLinks(); updatePreview();
    });
  });

  $('add-link-btn')?.addEventListener('click', addLink);
  return unsub;
}

async function addLink() {
  const titleEl = $('link-title-input');
  const urlEl   = $('link-url-input');
  const title   = titleEl?.value.trim();
  let   url     = urlEl?.value.trim();

  if (!title || !url) { showToast('Fill in both title and URL.', 'error'); return; }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const btn = $('add-link-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';

  try {
    await addDoc(collection(db, 'users', currentUser.uid, 'links'), {
      title, url, clicks: 0, order: links.length, createdAt: new Date().toISOString()
    });
    titleEl.value = ''; urlEl.value = '';
    showToast('Link added! 🔗', 'success');
  } catch { showToast('Error adding link.', 'error'); }
  finally { btn.disabled = false; btn.textContent = '+ Add'; }
}

function renderLinks() {
  const container = $('links-list');
  if (!container) return;

  if (links.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔗</div>
        <p>No links yet. Add your first one above!</p>
      </div>`;
    return;
  }

  container.innerHTML = links.map(link => `
    <div class="link-item" data-id="${link.id}">
      <div class="link-item-info">
        <div class="link-item-title">${escHtml(link.title)}</div>
        <div class="link-item-url">${escHtml(link.url)}</div>
      </div>
      <div class="link-item-clicks" title="Total clicks">📊 ${link.clicks || 0}</div>
      <div class="link-item-actions">
        <button class="icon-btn" onclick="openEditModal('${link.id}')" title="Edit">✏️</button>
        <button class="icon-btn delete" onclick="deleteLink('${link.id}')" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
}

// ── Edit Modal ───────────────────────────────────────────────
window.openEditModal = function(linkId) {
  const link = links.find(l => l.id === linkId);
  if (!link) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'edit-modal';
  overlay.innerHTML = `
    <div class="glass-strong modal">
      <div class="modal-header">
        <span class="modal-title">✏️ Edit Link</span>
        <button class="icon-btn" onclick="closeEditModal()">✕</button>
      </div>
      <div class="modal-form">
        <div class="form-group">
          <label for="edit-title">Title</label>
          <input id="edit-title" type="text" value="${escHtml(link.title)}" placeholder="e.g. My YouTube Channel">
        </div>
        <div class="form-group">
          <label for="edit-url">URL</label>
          <input id="edit-url" type="url" value="${escHtml(link.url)}" placeholder="https://...">
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeEditModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveEditedLink('${linkId}')">Save</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeEditModal(); });
};

window.closeEditModal = () => $('edit-modal')?.remove();

window.saveEditedLink = async function(linkId) {
  const title = $('edit-title')?.value.trim();
  let   url   = $('edit-url')?.value.trim();
  if (!title || !url) { showToast('Both fields are required.', 'error'); return; }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try {
    await updateDoc(doc(db, 'users', currentUser.uid, 'links', linkId), { title, url });
    closeEditModal();
    showToast('Updated! ✅', 'success');
  } catch { showToast('Error updating link.', 'error'); }
};

window.deleteLink = async function(linkId) {
  if (!confirm('Delete this link?')) return;
  try {
    await deleteDoc(doc(db, 'users', currentUser.uid, 'links', linkId));
    showToast('Link deleted.', 'info');
  } catch { showToast('Error deleting link.', 'error'); }
};

// ── Live Preview ─────────────────────────────────────────────
function updatePreview() {
  const { username = '', displayName = '', bio = '', avatarStyle = 'lorelei' } = currentProfile || {};
  const url = avatarUrl(username, avatarStyle);

  setAttr('preview-avatar', 'src', url);
  setText('preview-name',   displayName || username);
  setText('preview-bio',    bio || 'Your bio will appear here…');

  const linksEl = $('preview-links');
  if (linksEl) {
    linksEl.innerHTML = links.length
      ? links.map(l => `<div class="preview-link">${escHtml(l.title)}</div>`).join('')
      : '<div style="font-size:0.62rem;color:var(--text-muted);text-align:center;padding:0.5rem">Links appear here</div>';
  }
}
