import { auth, db } from './firebase-config.js';
import { requireAuth, showToast } from './auth.js';
import {
  doc, updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const generateId = () => Math.random().toString(36).substring(2, 9);
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

let currentUser = null;
let currentProfile = null;
let resumeData = { theme: 'modern-dark', layoutBlocks: [] };
let sortableResume = null;

// Default layouts for block insertion
const BLOCKS_CONFIG = {
  hero: () => ({ type: 'hero', data: { name: 'Your Name', role: 'Your Role / Title', bio: 'A short bio about yourself.' }, enabled: true }),
  experience: () => ({ type: 'experience', data: { company: 'Company Name', role: 'Job Title', duration: '2020 - Present', desc: 'Describe what you did.' }, enabled: true }),
  education: () => ({ type: 'education', data: { school: 'University Name', degree: 'Degree', year: '2016-2020' }, enabled: true }),
  skills: () => ({ type: 'skills', data: { tags: 'JavaScript, React, CSS' }, enabled: true }),
  projects: () => ({ type: 'projects', data: { title: 'Project Name', url: '', tech: 'Tech Stack', image: '' }, enabled: true }),
  contact: () => ({ type: 'contact', data: { email: '' }, enabled: true })
};

// --- Init
requireAuth(user => {
  currentUser = user;
  const docRef = doc(db, 'users', user.uid);
  
  onSnapshot(docRef, snap => {
    if(!snap.exists()) return;
    currentProfile = snap.data();
    if(currentProfile.resumeData) {
      resumeData = currentProfile.resumeData;
    }
    
    // Set theme picker explicitly
    const themeSelect = $('resume-theme-select');
    if(themeSelect && resumeData.theme) {
      themeSelect.value = resumeData.theme;
    }

    renderBuilderList();
    renderResumePreview();
  });
  
  initUI();
});

function initUI() {
  document.querySelectorAll('.resume-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      if(BLOCKS_CONFIG[type]) {
        const newBlock = { id: generateId(), ...BLOCKS_CONFIG[type]() };
        resumeData.layoutBlocks.push(newBlock);
        saveResumeData(true);
      }
    });
  });

  $('save-resume-settings-btn')?.addEventListener('click', () => {
    const theme = $('resume-theme-select')?.value || 'modern-dark';
    resumeData.theme = theme;
    saveResumeData(false, 'Settings saved! ✨');
  });

  $('view-resume-btn')?.addEventListener('click', (e) => {
    if(currentProfile && currentProfile.username) {
      e.target.href = `/resume/${currentProfile.username}`;
    }
  });
}

async function saveResumeData(silent = false, successMsg = 'Block saved!') {
  if(!currentUser) return;
  try {
    const docRef = doc(db, 'users', currentUser.uid);
    await updateDoc(docRef, { resumeData });
    if(!silent) showToast(successMsg, 'success');
  } catch(e) {
    if(!silent) showToast('Error saving resume data.', 'error');
    console.error(e);
  }
}

function renderBuilderList() {
  const container = $('resume-blocks-list');
  if(!container) return;
  
  if(!resumeData.layoutBlocks || resumeData.layoutBlocks.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📄</div><p>Start adding blocks from the left!</p></div>`;
    return;
  }

  container.innerHTML = resumeData.layoutBlocks.map(block => `
    <div class="link-item" data-id="${block.id}" style="${!block.enabled ? 'opacity:0.5' : ''}">
      <span class="drag-handle res-drag-handle" title="Drag to reorder">⠿</span>
      <div class="link-item-info">
        <div class="link-item-title" style="text-transform:capitalize">${block.type.replace('_', ' ')} Block</div>
        <div class="link-item-url" style="color:var(--text-muted);font-size:0.7rem">${getPreviewText(block)}</div>
      </div>
      <div class="link-item-actions">
        <button class="icon-btn" title="Toggle Visibility" onclick="toggleResumeBlock('${block.id}')">${block.enabled ? '👁️' : '🚫'}</button>
        <button class="icon-btn" onclick="editResumeBlock('${block.id}')">✏️</button>
        <button class="icon-btn delete" onclick="deleteResumeBlock('${block.id}')">🗑️</button>
      </div>
    </div>
  `).join('');

  initSortable();
}

function getPreviewText(block) {
  if(block.type === 'hero') return esc(block.data.name);
  if(block.type === 'experience') return esc(block.data.company + ' - ' + block.data.role);
  if(block.type === 'education') return esc(block.data.school);
  if(block.type === 'skills') return esc(block.data.tags.substring(0, 30));
  if(block.type === 'projects') return esc(block.data.title);
  if(block.type === 'contact') return 'Contact Form';
  return '';
}

function initSortable() {
  if (typeof Sortable==='undefined') return;
  if (sortableResume) sortableResume.destroy();
  sortableResume = Sortable.create($('resume-blocks-list'), {
    handle: '.res-drag-handle',
    ghostClass: 'sortable-ghost',
    animation: 160,
    onEnd: saveResumeOrder
  });
}

function saveResumeOrder() {
  const items = [...document.querySelectorAll('#resume-blocks-list .link-item')];
  const newOrder = items.map(el => {
    const id = el.dataset.id;
    return resumeData.layoutBlocks.find(b => b.id === id);
  }).filter(Boolean);
  
  resumeData.layoutBlocks = newOrder;
  saveResumeData(true);
}

// Global hooks for onclick handlers
window.toggleResumeBlock = id => {
  const block = resumeData.layoutBlocks.find(b => b.id === id);
  if(block) {
    block.enabled = !block.enabled;
    saveResumeData(true);
  }
};

window.deleteResumeBlock = id => {
  if(!confirm('Delete this block?')) return;
  resumeData.layoutBlocks = resumeData.layoutBlocks.filter(b => b.id !== id);
  saveResumeData(true);
};

window.editResumeBlock = id => {
  const block = resumeData.layoutBlocks.find(b => b.id === id);
  if(!block) return;
  
  const content = buildEditForm(block);

  const ov = document.createElement('div');
  ov.className = 'modal-overlay';
  ov.id = 'resume-edit-modal';
  ov.innerHTML = `
    <div class="glass-strong modal">
      <div class="modal-header">
        <span class="modal-title">✏️ Edit ${block.type.replace('_',' ')}</span>
        <button class="icon-btn" onclick="$('resume-edit-modal').remove()">✕</button>
      </div>
      <div class="modal-form" id="resume-modal-form">
        ${content}
        <div class="modal-actions" style="margin-top:15px">
          <button class="btn btn-ghost" onclick="$('resume-edit-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="saveResumeBlockEdits('${id}')">Save Changes</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', e => { if(e.target===ov) ov.remove(); });
};

function buildEditForm(block) {
  const d = block.data || {};
  let html = '';
  const makeInput = (key, label, type='text', ph='') => `
    <div class="form-group">
      <label>${label}</label>
      <input id="rb-${key}" type="${type}" placeholder="${ph}" value="${esc(d[key]||'')}">
    </div>`;
  const makeTextarea = (key, label) => `
    <div class="form-group">
      <label>${label}</label>
      <textarea id="rb-${key}">${esc(d[key]||'')}</textarea>
    </div>`;

  if(block.type === 'hero') {
    html += makeInput('name', 'Name');
    html += makeInput('role', 'Role / Headline');
    html += makeTextarea('bio', 'Bio');
  } else if(block.type === 'experience') {
    html += makeInput('company', 'Company');
    html += makeInput('role', 'Role');
    html += makeInput('duration', 'Duration (e.g. 2021-Present)');
    html += makeTextarea('desc', 'Description');
  } else if(block.type === 'education') {
    html += makeInput('school', 'School / University');
    html += makeInput('degree', 'Degree');
    html += makeInput('year', 'Year');
  } else if(block.type === 'skills') {
    html += makeInput('tags', 'Skills (comma separated)');
  } else if(block.type === 'projects') {
    html += makeInput('title', 'Project Title');
    html += makeInput('url', 'Project URL', 'url');
    html += makeInput('image', 'Image URL (optional)', 'url');
    html += makeInput('tech', 'Tech Stack (comma separated)');
  } else if(block.type === 'contact') {
    html += `<p style="font-size:0.8rem;color:var(--text-muted)">The contact block displays a standard email form. Form submissions will be saved to your dashboard in a future update.</p>`;
    html += makeInput('email', 'Forward inquiries to this Email (optional)');
  }
  return html;
}

window.saveResumeBlockEdits = id => {
  const block = resumeData.layoutBlocks.find(b => b.id === id);
  if(!block) return;
  const d = block.data;
  
  const getVal = key => {
    const el = $(`rb-${key}`);
    return el ? el.value : (typeof d[key] === 'string' ? '' : d[key]);
  };

  if(block.type === 'hero') { d.name = getVal('name'); d.role = getVal('role'); d.bio = getVal('bio'); }
  else if(block.type === 'experience') { d.company = getVal('company'); d.role = getVal('role'); d.duration = getVal('duration'); d.desc = getVal('desc'); }
  else if(block.type === 'education') { d.school = getVal('school'); d.degree = getVal('degree'); d.year = getVal('year'); }
  else if(block.type === 'skills') { d.tags = getVal('tags'); }
  else if(block.type === 'projects') { d.title = getVal('title'); d.url = getVal('url'); d.image = getVal('image'); d.tech = getVal('tech'); }
  else if(block.type === 'contact') { d.email = getVal('email'); }

  $('resume-edit-modal')?.remove();
  saveResumeData(false, 'Block updated!');
};

// --- Preview Renderer
function renderResumePreview() {
  const container = $('resume-preview-content');
  if(!container) return;

  const themeClass = resumeData.theme || 'modern-dark';
  container.className = `resume-preview-root theme-${themeClass}`;

  if(!resumeData.layoutBlocks || resumeData.layoutBlocks.length === 0) {
    container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.8rem;margin-top:50px">Empty Canvas</div>`;
    return;
  }

  container.innerHTML = `<div class="resume-canvas-inner" style="padding: 20px;">` + resumeData.layoutBlocks.map(block => {
    if(!block.enabled) return '';
    return renderPreviewBlock(block);
  }).join('') + `</div>`;
}

function renderPreviewBlock(block) {
  const d = block.data;
  if(block.type === 'hero') {
    return `<div class="res-block res-hero" style="margin-bottom:20px;text-align:center">
      <h2 style="font-size:1.5rem;font-weight:700;margin:0">${esc(d.name)}</h2>
      <p style="color:var(--p-accent, #a855f7);font-size:0.85rem;margin:4px 0">${esc(d.role)}</p>
      <p style="font-size:0.75rem;opacity:0.8;margin-top:8px">${esc(d.bio)}</p>
    </div>`;
  }
  if(block.type === 'experience') {
    return `<div class="res-block res-exp" style="margin-bottom:15px">
      <h3 style="font-size:0.8rem;color:var(--p-accent, #a855f7);margin:0 0 5px 0;letter-spacing:1px;text-transform:uppercase">Experience</h3>
      <div style="border-left:2px solid rgba(255,255,255,0.1);padding-left:12px;position:relative">
         <span style="position:absolute;left:-5px;top:0;width:8px;height:8px;background:var(--p-accent, #a855f7);border-radius:50%"></span>
         <div style="display:flex;justify-content:space-between;align-items:baseline">
           <strong style="font-size:0.9rem">${esc(d.role)}</strong>
           <span style="font-size:0.6rem;opacity:0.6">${esc(d.duration)}</span>
         </div>
         <div style="font-size:0.75rem;opacity:0.8">${esc(d.company)}</div>
         <p style="font-size:0.7rem;margin-top:6px;opacity:0.7">${esc(d.desc)}</p>
      </div>
    </div>`;
  }
  if(block.type === 'education') {
    return `<div class="res-block res-edu" style="margin-bottom:15px">
      <h3 style="font-size:0.8rem;color:var(--p-accent, #a855f7);margin:0 0 5px 0;letter-spacing:1px;text-transform:uppercase">Education</h3>
      <div style="border-left:2px solid rgba(255,255,255,0.1);padding-left:12px;position:relative">
         <span style="position:absolute;left:-5px;top:0;width:8px;height:8px;background:var(--p-accent, #a855f7);border-radius:50%"></span>
         <div style="display:flex;justify-content:space-between;align-items:baseline">
           <strong style="font-size:0.9rem">${esc(d.degree)}</strong>
           <span style="font-size:0.6rem;opacity:0.6">${esc(d.year)}</span>
         </div>
         <div style="font-size:0.75rem;opacity:0.8">${esc(d.school)}</div>
      </div>
    </div>`;
  }
  if(block.type === 'skills') {
    const tags = (d.tags||'').split(',').map(s=>s.trim()).filter(Boolean);
    const tagsHtml = tags.map(t=>`<span style="display:inline-block;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);padding:3px 8px;font-size:0.65rem;border-radius:12px;margin:2px">${esc(t)}</span>`).join('');
    return `<div class="res-block res-skills" style="margin-bottom:15px">
      <h3 style="font-size:0.8rem;color:var(--p-accent, #a855f7);margin:0 0 5px 0;letter-spacing:1px;text-transform:uppercase">Skills</h3>
      <div>${tagsHtml}</div>
    </div>`;
  }
  if(block.type === 'projects') {
    const imgHtml = d.image ? `<img src="${esc(d.image)}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:8px">` : '';
    return `<div class="res-block res-proj" style="margin-bottom:15px">
      <h3 style="font-size:0.8rem;color:var(--p-accent, #a855f7);margin:0 0 5px 0;letter-spacing:1px;text-transform:uppercase">Project</h3>
      <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.05)">
        ${imgHtml}
        <strong style="font-size:0.85rem">${esc(d.title)}</strong>
        <p style="font-size:0.65rem;opacity:0.7;margin:4px 0">${esc(d.tech)}</p>
      </div>
    </div>`;
  }
  if(block.type === 'contact') {
    return `<div class="res-block res-contact" style="margin-bottom:15px">
      <h3 style="font-size:0.8rem;color:var(--p-accent, #a855f7);margin:0 0 5px 0;letter-spacing:1px;text-transform:uppercase">Contact</h3>
      <div style="display:flex;flex-direction:column;gap:5px">
        <input disabled placeholder="Name" style="padding:6px;font-size:0.7rem;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.1);border-radius:4px">
        <textarea disabled placeholder="Message" style="padding:6px;font-size:0.7rem;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.1);border-radius:4px;height:40px"></textarea>
        <button disabled style="background:var(--p-accent, #a855f7);color:#fff;border:none;padding:6px;border-radius:4px;font-size:0.7rem">Send Message</button>
      </div>
    </div>`;
  }
  return '';
}
