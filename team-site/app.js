import { profiles as initialProfiles } from './profiles.js';
let profiles = initialProfiles;
let editingOpen = false;
let saving = false;
let editing = false;
let maxCvBytes = 3 * 1024 * 1024;
const editor = document.querySelector('#profile-editor');

const $ = (selector) => document.querySelector(selector);
const dialog = $('#profile-dialog');
const pdfDialog = $('#pdf-dialog');
let pdfRequest;
let pdfObjectUrl;
let resumeTrigger;
let activeProfile;
let lastTrigger;

// These symbols represent breadth, systems, protection, and observation.
const symbols = {
  asterisk: '<g stroke-width="13"><path d="M60 12v96M12 60h96M26 26l68 68M26 94l68-68"/></g><circle cx="60" cy="60" r="13" class="solid"/>',
  grid: '<path d="M24 24h72v72H24zM24 48h72M24 72h72M48 24v72M72 24v72"/><path d="M48 48h24v24H48z" class="solid"/><path d="M12 12h24M12 12v24M108 12H84M108 12v24M12 108h24M12 108V84M108 108H84M108 108V84"/>',
  diamond: '<path d="M60 10l45 50-45 50L15 60zM60 23l33 37-33 37-33-37zM60 36l21 24-21 24-21-24zM60 49l10 11-10 11-10-11z"/><path d="M15 60h90M60 10v100"/>',
  orbit: '<ellipse cx="60" cy="60" rx="45" ry="23"/><ellipse cx="60" cy="60" rx="45" ry="23" transform="rotate(60 60 60)"/><ellipse cx="60" cy="60" rx="45" ry="23" transform="rotate(120 60 60)"/><circle cx="60" cy="60" r="8" class="solid"/>',
};
const githubIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .8a11.2 11.2 0 0 0-3.54 21.82c.56.1.76-.24.76-.54v-2.1c-3.12.68-3.78-1.33-3.78-1.33-.51-1.3-1.24-1.65-1.24-1.65-1.02-.7.08-.68.08-.68 1.12.08 1.72 1.15 1.72 1.15 1 .1 1.6 1.93 3.26 1.36.1-.73.39-1.23.71-1.51-2.49-.29-5.11-1.25-5.11-5.54 0-1.22.44-2.22 1.15-3-.11-.28-.5-1.42.11-2.96 0 0 .94-.3 3.08 1.15a10.74 10.74 0 0 1 5.6 0c2.14-1.45 3.08-1.15 3.08-1.15.61 1.54.22 2.68.11 2.97.72.77 1.15 1.77 1.15 2.99 0 4.3-2.63 5.25-5.13 5.53.4.35.76 1.03.76 2.08v3.09c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z"/></svg>';
const linkedinIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM7.93 18.75H4.98V9.2h2.95v9.55ZM6.46 7.9a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42Zm12.29 10.85H15.8V14.1c0-1.1-.02-2.52-1.54-2.52-1.54 0-1.78 1.2-1.78 2.44v4.73H9.53V9.2h2.83v1.3h.04c.39-.74 1.35-1.53 2.78-1.53 2.97 0 3.52 1.95 3.52 4.49v5.29Z"/></svg>';
const symbol = (name) => `<svg class="art-symbol" viewBox="0 0 120 120" aria-hidden="true">${symbols[name]}</svg>`;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function githubLink(handle, className = 'text-link social-link') {
  if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(handle)) return null;
  const link = element('a', className);
  link.href = `https://github.com/${encodeURIComponent(handle)}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.innerHTML = githubIcon;
  link.append(element('span', '', 'GitHub ↗'));
  return link;
}

function linkedinLink(address, className = 'text-link social-link') {
  if (!address) return null;
  let url;
  try { url = new URL(address); } catch { return null; }
  if (url.protocol !== 'https:' || !['linkedin.com', 'www.linkedin.com'].includes(url.hostname) || !url.pathname.startsWith('/in/')) return null;
  const link = element('a', className);
  link.href = url.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.innerHTML = linkedinIcon;
  link.append(element('span', '', 'LinkedIn ↗'));
  return link;
}

function pendingSocial(label, icon) {
  const pending = element('span', 'social-link social-pending');
  pending.setAttribute('aria-label', `${label} coming soon`);
  pending.innerHTML = icon;
  pending.append(element('span', '', label), element('small', '', 'Soon'));
  return pending;
}

function resumeUrl(path) {
  if (!path) return null;
  try {
    const url = new URL(path, location.href);
    return url.origin === location.origin && (/\.pdf$/i.test(url.pathname) || url.pathname === '/api/resume') ? url : null;
  } catch { return null; }
}

function renderTeam() {
  const grid = $('#team-grid');
  grid.replaceChildren();
  for (const base of profiles) {
    const profile = base;
    const card = element('article', 'team-card');
    card.dataset.person = profile.id;
    const art = element('button', 'card-art');
    art.type = 'button';
    art.setAttribute('aria-label', `Meet ${profile.name}`);
    art.setAttribute('aria-haspopup', 'dialog');
    art.innerHTML = symbol(profile.symbol);
    art.append(element('span', 'art-monogram', profile.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('')));
    art.append(element('span', 'art-caption', profile.role));
    const arrow = element('span', 'art-open', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    art.append(arrow);
    art.addEventListener('click', () => openProfile(base, art));
    const content = element('div', 'card-content');
    content.append(element('h2', '', profile.name), element('p', 'card-discipline', profile.discipline), element('p', 'card-description', profile.description));
    const socials = element('div', 'card-socials');
    socials.append(
      githubLink(profile.github, 'text-link social-link') || pendingSocial('GitHub', githubIcon),
      linkedinLink(profile.linkedin) || pendingSocial('LinkedIn', linkedinIcon),
    );
    content.append(socials);
    card.addEventListener('click', (event) => {
      if (!event.target.closest('a, button') && !window.getSelection()?.toString()) openProfile(profile, art);
    });
    card.append(art, content);
    grid.append(card);
  }
}

function overviewSection(title, text) {
  const section = element('section', 'overview-section');
  section.append(element('h3', '', title), element('p', '', text));
  return section;
}

function action(label, handler, solid = false) {
  const button = element('button', solid ? 'button button-solid' : 'button', label);
  button.type = 'button';
  button.addEventListener('click', handler);
  return button;
}

function renderProfile() {
  const profile = activeProfile;
  $('#profile-name').textContent = profile.name;
  $('#profile-discipline').textContent = profile.discipline;
  $('#profile-mark').innerHTML = symbol(profile.symbol);
  const view = $('#profile-overview');
  view.replaceChildren(overviewSection('About', profile.summary));
  if (profile.skills.length) {
    const section = element('section', 'overview-section');
    section.append(element('h3', '', 'Areas of focus'));
    const skills = element('ul', 'skill-list');
    for (const skill of profile.skills) skills.append(element('li', '', skill));
    section.append(skills);
    view.append(section);
  }
  if (profile.education) view.append(overviewSection('Education', profile.education));
  if (profile.experience) view.append(overviewSection('Experience & projects', profile.experience));
  const actions = $('#profile-actions');
  const url = resumeUrl(profile.resumePdf);
  const resume = action('View resume ↗', () => openResume(profile, url, resume), true);
  resume.disabled = !url;
  resume.setAttribute('aria-haspopup', 'dialog');
  actions.replaceChildren(resume);
  const github = githubLink(profile.github, 'button social-link');
  const linkedin = linkedinLink(profile.linkedin, 'button social-link');
  if (github) actions.append(github);
  if (linkedin) actions.append(linkedin);
  if (editingOpen) actions.append(action('Edit profile', startEditing));
  $('#resume-availability').hidden = Boolean(url);
  if (!url) resume.setAttribute('aria-describedby', 'resume-availability');

}

function openProfile(profile, trigger) {
  lastTrigger = trigger;
  activeProfile = profile;
  setEditing(false);
  $('#editor-status').textContent = '';
  renderProfile();
  dialog.showModal();
  dialog.scrollTop = 0;
  $('#profile-name').focus({ preventScroll: true });
}

$('#close-dialog').addEventListener('click', () => { if (!saving) dialog.close(); });
dialog.addEventListener('cancel', (event) => { if (saving) event.preventDefault(); });
dialog.addEventListener('click', (event) => { if (event.target === dialog && !saving) {
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
} });
dialog.addEventListener('close', () => {
  setEditing(false);
  lastTrigger?.focus({ preventScroll: true });
});

async function openResume(profile, url, trigger) {
  if (!url) return;
  resumeTrigger = trigger;
  $('#pdf-title').textContent = `${profile.name}’s resume`;
  $('#pdf-content').replaceChildren();
  $('#pdf-status').textContent = 'Loading resume…';
  $('#pdf-status').hidden = false;
  $('#pdf-links').hidden = true;
  pdfDialog.showModal();
  $('#close-pdf').focus({ preventScroll: true });
  const request = new AbortController();
  pdfRequest = request;
  try {
    const response = await fetch(url.href, { signal: request.signal });
    if (!response.ok) throw new Error('Resume not available.');
    const blob = await response.blob();
    if (await blob.slice(0, 5).text() !== '%PDF-') throw new Error('Invalid PDF.');
    if (request.signal.aborted) return;
    pdfObjectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    const frame = element('iframe', 'pdf-frame');
    frame.title = `${profile.name}’s resume PDF`;
    frame.src = pdfObjectUrl;
    $('#pdf-content').replaceChildren(frame);
    $('#pdf-download').href = pdfObjectUrl;
    $('#pdf-download').download = `${profile.id}-resume.pdf`;
    $('#pdf-open').href = url.href;
    $('#pdf-links').hidden = false;
    $('#pdf-status').hidden = true;
  } catch (error) {
    if (request.signal.aborted) return;
    $('#pdf-status').textContent = 'This resume could not be opened. Please try again later.';
  }
}

$('#close-pdf').addEventListener('click', () => pdfDialog.close());
pdfDialog.addEventListener('click', (event) => {
  if (event.target !== pdfDialog) return;
  const rect = pdfDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) pdfDialog.close();
});
pdfDialog.addEventListener('close', () => {
  pdfRequest?.abort();
  $('#pdf-content').replaceChildren();
  if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
  pdfObjectUrl = undefined;
  $('#pdf-download').removeAttribute('href');
  $('#pdf-open').removeAttribute('href');
  resumeTrigger?.focus({ preventScroll: true });
});

function setEditing(value) {
  editing = value;
  editor.hidden = !value;
  $('#profile-overview').hidden = value;
  $('#profile-actions').hidden = value;
  $('#resume-availability').hidden = value || Boolean(activeProfile?.resumePdf);
}

function startEditing() {
  editor.reset();
  for (const name of ['name', 'role', 'discipline', 'description', 'summary', 'education', 'experience', 'github', 'linkedin']) editor.elements[name].value = activeProfile[name] || '';
  editor.elements.skills.value = activeProfile.skills.join('\n');
  $('#current-cv').textContent = activeProfile.resumeName ? `Current CV: ${activeProfile.resumeName}` : 'No CV uploaded yet.';
  $('#remove-cv-label').hidden = !activeProfile.resumePdf;
  $('#editor-status').textContent = '';
  setEditing(true);
  editor.elements.name.focus();
}

$('#cancel-editor').addEventListener('click', () => {
  setEditing(false);
  $('#editor-status').textContent = '';
  [...$('#profile-actions').querySelectorAll('button')].find(button => button.textContent === 'Edit profile')?.focus();
});
$('#cv-upload').addEventListener('change', () => { editor.elements.removeCv.checked = false; });
editor.elements.removeCv.addEventListener('change', () => { if (editor.elements.removeCv.checked) $('#cv-upload').value = ''; });

function fileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('The CV could not be read. Choose the file again.'));
    reader.readAsDataURL(file);
  });
}

editor.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (saving) return;
  const id = activeProfile.id;
  const fields = {};
  for (const name of ['name', 'role', 'discipline', 'description', 'summary', 'education', 'experience', 'github', 'linkedin']) fields[name] = editor.elements[name].value.trim();
  fields.skills = editor.elements.skills.value.split(/[\n,]/).map(skill => skill.trim()).filter(Boolean);
  const file = $('#cv-upload').files[0];
  const input = { revision: activeProfile.revision ?? null, fields, removeCv: editor.elements.removeCv.checked };
  saving = true;
  $('#editor-fields').disabled = true;
  $('#close-dialog').disabled = true;
  $('#save-profile').textContent = 'Saving…';
  $('#editor-status').textContent = file ? 'Uploading your CV and saving your profile…' : 'Saving your profile…';
  try {
    if (file) {
      if (file.size > maxCvBytes) throw new Error('Choose a PDF smaller than 3 MB.');
      if (await file.slice(0, 5).text() !== '%PDF-') throw new Error('Choose a valid PDF file.');
      input.cv = { name: file.name, base64: await fileBase64(file) };
    }
    const response = await fetch(`/api/profiles?id=${encodeURIComponent(id)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    });
    const result = await response.json().catch(() => { throw new Error('The server could not save your changes. Please try again.'); });
    if (!response.ok) throw new Error(result.error || 'Your changes could not be saved. Please try again.');
    profiles = profiles.map(profile => profile.id === id ? result.profile : profile);
    activeProfile = result.profile;
    renderTeam();
    lastTrigger = document.querySelector(`[data-person="${id}"] .card-art`);
    renderProfile();
    setEditing(false);
    editor.reset();
    $('#editor-status').textContent = 'Saved to the website. Everyone can see your changes.';
  } catch (error) {
    $('#editor-status').textContent = error.message || 'Could not reach the website. Check your connection and try again.';
  } finally {
    saving = false;
    $('#editor-fields').disabled = false;
    $('#close-dialog').disabled = false;
    $('#save-profile').textContent = 'Save to website';
    $('#editor-status').focus({ preventScroll: true });
  }
});

async function refreshProfiles() {
  try {
    const response = await fetch('/api/profiles', { cache: 'no-store' });
    if (!response.ok) throw new Error();
    const result = await response.json();
    profiles = result.profiles;
    editingOpen = result.editingOpen;
    maxCvBytes = result.maxCvBytes;
    renderTeam();
    $('#editing-notice').hidden = !editingOpen;
    $('#site-status').textContent = '';
    if (dialog.open && !editing && !saving) {
      activeProfile = profiles.find(profile => profile.id === activeProfile.id);
      lastTrigger = document.querySelector(`[data-person="${activeProfile.id}"] .card-art`);
      renderProfile();
    }
  } catch {
    $('#site-status').textContent = 'Live profiles could not be refreshed. Reload the page to try again.';
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !editing && !saving) refreshProfiles();
});
renderTeam();
refreshProfiles();
