// ============================================================
// DripBio.bond — Auth Helpers
// ============================================================

import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc, setDoc, getDoc, runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Toast Notification ───────────────────────────────────────
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
  setTimeout(() => toast.remove(), 3500);
}

// ── Username Validation ──────────────────────────────────────
export function isValidUsername(username) {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

// ── Check Username Availability ──────────────────────────────
// Simple read-based check (for real-time UI feedback only).
// The actual uniqueness guarantee is enforced by the transaction in signUp().
export async function checkUsernameAvailable(username) {
  try {
    if (!isValidUsername(username)) return false;
    const snap = await getDoc(doc(db, 'usernames', username.toLowerCase()));
    return !snap.exists();
  } catch (err) {
    // If Firestore rules block the read, treat as unavailable for safety
    console.warn('Username check failed:', err.code);
    return false;
  }
}

// ── Sign Up ──────────────────────────────────────────────────
// Uses a Firestore TRANSACTION to atomically claim the username.
// This prevents race conditions where two users grab the same username.
export async function signUp(username, email, password) {
  const clean = username.toLowerCase().trim();

  if (!isValidUsername(clean)) {
    throw new Error('Username must be 3–20 chars: letters, numbers, underscore only.');
  }

  // Quick pre-check before creating auth account (better UX)
  const preSnap = await getDoc(doc(db, 'usernames', clean));
  if (preSnap.exists()) {
    throw new Error('That username is already taken! Try another one. 😅');
  }

  // Step 1: Create Firebase Auth account
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    // Re-throw auth errors as-is (wrong password length, email exists, etc.)
    throw err;
  }

  const uid = cred.user.uid;

  try {
    // Step 2: ATOMIC transaction — claim username + write profile together.
    // If another user claimed the username between step 1 and now, this throws.
    await runTransaction(db, async (txn) => {
      const usernameRef  = doc(db, 'usernames', clean);
      const usernameSnap = await txn.get(usernameRef);

      if (usernameSnap.exists()) {
        // Someone else grabbed it in the tiny window — abort!
        throw new Error('That username was just taken by someone else! Please try a different one.');
      }

      // Write username index
      txn.set(usernameRef, { uid });

      // Write user profile
      txn.set(doc(db, 'users', uid), {
        uid,
        username:    clean,
        email,
        displayName: clean,
        bio:         '',
        avatarStyle: 'lorelei',
        createdAt:   new Date().toISOString()
      });
    });
  } catch (err) {
    // Transaction failed → delete the orphaned Auth account so user can retry
    try { await cred.user.delete(); } catch { /* ignore delete errors */ }
    throw err;
  }

  // Send verification email (non-blocking — don't fail signup if this errors)
  try {
    await sendEmailVerification(cred.user, {
      url: `${window.location.origin}/verify-complete.html`,
      handleCodeInApp: false,
    });
  } catch (e) { console.warn('Verification email failed:', e.message); }

  return cred.user;
}

// ── Resend Verification Email ─────────────────────────────────
export async function resendVerificationEmail(user) {
  await sendEmailVerification(user, {
    url: `${window.location.origin}/verify-complete.html`,
    handleCodeInApp: false,
  });
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
