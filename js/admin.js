// ============================================================
// DripBio.bond — Admin Panel Logic
// ============================================================

import { auth, db } from './firebase-config.js';
import { requireAuth, getUserProfile, showToast } from './auth.js';
import {
  collection, getDocs, doc, writeBatch, query, getCountFromServer, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── State ────────────────────────────────────────────────────
let currentUser = null;
let profile = null;
let allUsers = [];

// ── Boot ─────────────────────────────────────────────────────
requireAuth(async user => {
  currentUser = user;
  
  try {
    profile = await getUserProfile(user.uid);
    if (!profile || profile.isAdmin !== true) {
      showToast('⚠️ Unauthorized access.', 'error');
      setTimeout(() => { window.location.href = '/dashboard.html'; }, 1000);
      return;
    }
    
    // We are confirmed Admin
    document.getElementById('admin-loading').style.display = 'none';
    document.getElementById('admin-content').style.display = 'grid';

    loadData();
    document.getElementById('refresh-btn').addEventListener('click', loadData);

  } catch (err) {
    showToast('Admin check failed.', 'error');
    window.location.href = '/dashboard.html';
  }
});

// ── Fetch Data ────────────────────────────────────────────────
async function loadData() {
  document.getElementById('users-tbody').innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 3rem"><span class="spinner"></span></td></tr>`;
  
  try {
    // 1. Get user counts via aggregation (fast and cheap)
    const usersRef = collection(db, 'users');
    const totalSnap = await getCountFromServer(usersRef);
    document.getElementById('stat-total-users').textContent = totalSnap.data().count;

    const verifiedQuery = query(usersRef, where('isVerified', '==', true));
    const verifiedSnap = await getCountFromServer(verifiedQuery);
    document.getElementById('stat-verified-users').textContent = verifiedSnap.data().count;

    // 2. Load all users (for small/medium DBs this is fine, otherwise needs pagination)
    const usersSnap = await getDocs(usersRef);
    allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Sort by newest first
    allUsers.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    renderUsers();

  } catch (err) {
    console.error("Data load error:", err);
    showToast('Failed to load users. Check permissions.', 'error');
    document.getElementById('users-tbody').innerHTML = `<tr><td colspan="6" style="text-align:center; color: #ef4444">Permission Denied</td></tr>`;
  }
}

// ── Render ────────────────────────────────────────────────────
function renderUsers() {
  const tbody = document.getElementById('users-tbody');
  if (allUsers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center">No users found.</td></tr>`;
    return;
  }

  tbody.innerHTML = allUsers.map(u => {
    const isVeri = u.isVerified;
    const badgeHtml = isVeri 
      ? `<span class="badge badge-verified">Verified</span>` 
      : `<span class="badge badge-unverified">Unverified</span>`;
      
    const adminBadge = u.isAdmin ? `<br><span class="badge badge-admin">ADMIN</span>` : '';
    const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A';
    
    // Safety escapes
    const uname = u.username ? String(u.username).replace(/</g, "&lt;") : 'N/A';
    const email = u.email ? String(u.email).replace(/</g, "&lt;") : 'N/A';
    const mobile = u.mobileNumber ? String(u.mobileNumber).replace(/</g, "&lt;") : '-';

    return `
      <tr data-id="${u.id}">
        <td>
          <div style="font-weight:600; color:var(--text-primary)">@${uname}</div>
          <div style="font-size:0.75rem; color:var(--text-muted)">ID: ${u.id.substring(0,8)}...</div>
          ${adminBadge}
        </td>
        <td>${email}</td>
        <td>${mobile}</td>
        <td>${dateStr}</td>
        <td>${badgeHtml}</td>
        <td>
          ${u.isAdmin ? '' : `<button class="btn btn-ghost btn-sm delete-btn" style="color:#ef4444; border-color:rgba(239,68,68,0.2)" data-uid="${u.id}" data-uname="${uname}">🗑️ Delete</button>`}
        </td>
      </tr>
    `;
  }).join('');

  // Attach listeners
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.getAttribute('data-uid');
      const uname = btn.getAttribute('data-uname');
      confirmDelete(uid, uname);
    });
  });
}

// ── Soft Delete ───────────────────────────────────────────────
async function confirmDelete(uid, uname) {
  if (!confirm(`🚨 Are you absolutely sure you want to completely wipe @${uname}?\n\nThis will delete their profile and free up the username, effectively severing their auth account from DripBio.`)) return;

  try {
    // Delete username mapping + user doc
    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', uid));
    batch.delete(doc(db, 'usernames', uname));
    
    await batch.commit();
    showToast(`User @${uname} deleted completely.`, 'success');
    
    // Refresh
    loadData();
  } catch (err) {
    console.error(err);
    showToast('Failed to delete user.', 'error');
  }
}
