import { db } from './firebase-config.js';
import { doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const show = id => { const e=document.getElementById(id); if(e) e.style.display=''; };
const hide = id => { const e=document.getElementById(id); if(e) e.style.display='none'; };
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const pathParts = window.location.pathname.split('/').filter(Boolean);
const username = pathParts[pathParts.length - 1]?.toLowerCase().replace(/\.html$/,'');

(async () => {
  show('resume-loading'); hide('resume-wrapper'); hide('resume-not-found');

  if (!username) { window.location.href='/'; return; }

  try {
    const usernameDoc = await getDoc(doc(db,'usernames',username));
    if (!usernameDoc.exists()) {
      hide('resume-loading'); show('resume-not-found');
      document.title = 'Not Found — Resume'; return;
    }

    const uid = usernameDoc.data().uid;
    const profileSnap = await getDoc(doc(db,'users',uid));
    if (!profileSnap.exists()) { hide('resume-loading'); show('resume-not-found'); return; }

    const profile = profileSnap.data();
    const resumeData = profile.resumeData;

    if(!resumeData || !resumeData.layoutBlocks || resumeData.layoutBlocks.length === 0) {
      hide('resume-loading'); show('resume-not-found'); return;
    }

    applyTheme(resumeData.theme || 'modern-dark');
    renderResume(resumeData.layoutBlocks, uid, profile);
    
    hide('resume-loading'); show('resume-wrapper');
    document.title = `${profile.displayName||profile.username} — Interactive Resume`;

  } catch (err) {
    console.error('Resume load error:', err);
    hide('resume-loading'); show('resume-not-found');
  }
})();

function applyTheme(theme) {
  const root = document.getElementById('resume-wrapper');
  if(!root) return;
  root.className = `theme-${theme}`;
  
  if(theme === 'modern-dark') {
    document.body.style.background = '#09090b'; // Zinc 950
    document.body.style.color = '#f4f4f5';      // Zinc 100
    document.documentElement.style.setProperty('--hr-color', 'rgba(255,255,255,0.1)');
    document.documentElement.style.setProperty('--card-bg', 'rgba(255,255,255,0.03)');
    document.documentElement.style.setProperty('--card-border', 'rgba(255,255,255,0.08)');
    document.documentElement.style.setProperty('--accent', '#a855f7'); 
  } else if (theme === 'minimal-light') {
    document.body.style.background = '#fafafa'; // Zinc 50
    document.body.style.color = '#09090b';      // Zinc 950
    document.documentElement.style.setProperty('--hr-color', 'rgba(0,0,0,0.1)');
    document.documentElement.style.setProperty('--card-bg', '#ffffff');
    document.documentElement.style.setProperty('--card-border', 'rgba(0,0,0,0.08)');
    document.documentElement.style.setProperty('--accent', '#000000'); 
  } else if (theme === 'glassmorphism') {
    document.body.style.background = 'radial-gradient(circle at top right, rgba(168,85,247,0.15) 0%, transparent 60%), #0f0f0f';
    document.body.style.color = '#f1f1f1';
    document.documentElement.style.setProperty('--hr-color', 'rgba(255,255,255,0.1)');
    document.documentElement.style.setProperty('--card-bg', 'rgba(255,255,255,0.02)');
    document.documentElement.style.setProperty('--card-border', 'rgba(255,255,255,0.05)');
    document.documentElement.style.setProperty('--accent', '#a855f7'); 
    root.style.backdropFilter = 'blur(10px)';
  }
}

function renderResume(blocks, uid, profile) {
  const container = document.getElementById('resume-wrapper');
  let html = '';
  
  blocks.forEach(block => {
    if(!block.enabled) return;
    const d = block.data || {};
    
    if(block.type === 'hero') {
      html += `
        <section class="res-pub res-hero">
          <h1 class="res-h1">${esc(d.name)}</h1>
          <h2 class="res-h2">${esc(d.role)}</h2>
          <p class="res-bio">${esc(d.bio)}</p>
        </section>
      `;
    } else if (block.type === 'experience') {
      html += `
        <section class="res-pub res-experience">
          <h3 class="res-h3">Experience</h3>
          <div class="exp-item">
            <div class="exp-header">
              <span class="exp-role">${esc(d.role)} at ${esc(d.company)}</span>
              <span class="exp-date">${esc(d.duration)}</span>
            </div>
            <p class="exp-desc">${esc(d.desc)}</p>
          </div>
        </section>
      `;
    } else if (block.type === 'education') {
      html += `
        <section class="res-pub res-education">
          <h3 class="res-h3">Education</h3>
          <div class="edu-item">
            <div class="edu-header">
              <span class="edu-degree">${esc(d.degree)}</span>
              <span class="edu-date">${esc(d.year)}</span>
            </div>
            <p class="edu-school">${esc(d.school)}</p>
          </div>
        </section>
      `;
    } else if (block.type === 'skills') {
      const tags = (d.tags||'').split(',').map(s=>s.trim()).filter(Boolean);
      const tagsHtml = tags.map(t=>`<span class="skill-tag">${esc(t)}</span>`).join('');
      html += `
        <section class="res-pub res-skills">
          <h3 class="res-h3">Skills & Expertise</h3>
          <div class="skills-grid">${tagsHtml}</div>
        </section>
      `;
    } else if (block.type === 'projects') {
      const imgHtml = d.image ? `<img src="${esc(d.image)}" alt="cover" class="proj-img">` : '';
      const anchorStart = d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer" class="proj-link">` : '<div class="proj-link">';
      const anchorEnd = d.url ? `</a>` : '</div>';
      html += `
        <section class="res-pub res-projects">
          <h3 class="res-h3">Projects</h3>
          ${anchorStart}
          <div class="proj-card">
            ${imgHtml}
            <div class="proj-info">
              <h4 class="proj-title">${esc(d.title)} ${d.url ? '↗' : ''}</h4>
              <p class="proj-tech">${esc(d.tech)}</p>
            </div>
          </div>
          ${anchorEnd}
        </section>
      `;
    } else if (block.type === 'contact') {
      html += `
        <section class="res-pub res-contact">
          <h3 class="res-h3">Get In Touch</h3>
          <form id="res-contact-form" data-uid="${uid}">
             <input class="res-input" type="text" id="c-name" placeholder="Name" required />
             <input class="res-input" type="email" id="c-email" placeholder="Email" required />
             <textarea class="res-input" id="c-msg" placeholder="Your Message" required rows="4"></textarea>
             <button class="res-btn" type="submit">Send Message</button>
             <p id="c-status" style="display:none; font-size:0.85rem; margin-top:10px"></p>
          </form>
        </section>
      `;
    }
  });

  container.innerHTML = html;
  
  // Bind contact form logic
  const contactForm = document.getElementById('res-contact-form');
  if(contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = document.getElementById('c-status');
      const btn = contactForm.querySelector('button');
      btn.disabled = true;
      btn.textContent = "Sending...";
      
      try {
        const payload = {
          name: document.getElementById('c-name').value,
          email: document.getElementById('c-email').value,
          message: document.getElementById('c-msg').value,
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'users', uid, 'messages'), payload);
        statusEl.style.display = 'block';
        statusEl.style.color = '#10b981'; // green
        statusEl.textContent = "Message sent successfully! ✅";
        contactForm.reset();
      } catch(err) {
        statusEl.style.display = 'block';
        statusEl.style.color = '#ef4444'; // red
        statusEl.textContent = "Error sending message. Please try again.";
        console.error(err);
      } finally {
        setTimeout(() => { if(!contactForm.querySelector('button').disabled) statusEl.style.display='none'; }, 5000);
        btn.disabled = false;
        btn.textContent = "Send Message";
      }
    });
  }
}
