// ============================================================
// DripBio.bond — Firebase Configuration
// ============================================================
// 🔧 Replace the values below with your Firebase project config.
// Get them from: Firebase Console → Project Settings → Your Apps → SDK Setup
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDNvf7wFPVYGGmwx4JKJvYi0q7mFq1S7X8",
  authDomain:        "dripbio.firebaseapp.com",
  projectId:         "dripbio",
  storageBucket:     "dripbio.firebasestorage.app",
  messagingSenderId: "760538635127",
  appId:             "1:760538635127:web:1d1fc6770327c7d4785f72",
  measurementId:     "G-N6F80T9BNE"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
