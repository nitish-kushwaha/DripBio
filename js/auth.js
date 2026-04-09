// ============================================================
// DripBio.bond — Auth Helpers
// ============================================================

import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc, setDoc, getDoc, collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Toast Notification ──────────────────────────────────────
export function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: '💜' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || '💜'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ── Username Validation ──────────────────────────────────────
export function isValidUsername(username) {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

// ── Check Username Availability ──────────────────────────────
export async function checkUsernameAvailable(username) {
  if (!isValidUsername(username)) return false;
  const snap = await getDoc(doc(db, 'usernames', username.toLowerCase()));
  return !snap.exists();
}

// ── Sign Up ──────────────────────────────────────────────────
export async function signUp(username, email, password) {
  const clean = username.toLowerCase().trim();

  if (!isValidUsername(clean)) {
    throw new Error('Username must be 3–20 chars: letters, numbers, underscore only.');
  }

  const available = await checkUsernameAvailable(clean);
  if (!available) throw new Error('That username is already taken! Try another. 😅');

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid  = cred.user.uid;

  // User profile document
  await setDoc(doc(db, 'users', uid), {
    uid,
    username:    clean,
    email,
    displayName: clean,
    bio:         '',
    avatarStyle: 'lorelei',
    createdAt:   new Date().toISOString()
  });

  // Username → UID index for fast lookups
  await setDoc(doc(db, 'usernames', clean), { uid });

  return cred.user;
}

// ── Log In ───────────────────────────────────────────────────
export async function logIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ── Log Out ──────────────────────────────────────────────────
export async function logOut() {
  await signOut(auth);
}

// ── Auth Guard ───────────────────────────────────────────────
// Redirects to /login.html if not authenticated.
export function requireAuth(callback) {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = '/login.html';
    } else {
      callback(user);
    }
  });
}

// ── Get User Profile by UID ──────────────────────────────────
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// ── Get UID by Username ──────────────────────────────────────
export async function getUidByUsername(username) {
  const snap = await getDoc(doc(db, 'usernames', username.toLowerCase()));
  return snap.exists() ? snap.data().uid : null;
}
