/* ==========================================================================
   settings.js — Settings page
   ========================================================================== */

let settingsActiveTab = 'general';
let pendingLogoDataUrl = null;

function renderSettingsPage(root) {
  const settings = getSettings();

  root.innerHTML = `
    <div class="settings-grid">
      <div class="settings-nav">
        <button class="tab-general active" data-tab="general"><i class="fa-solid fa-building" style="width:16px;"></i> Institute (General)</button>
        <button class="tab-profile" data-tab="profile"><i class="fa-solid fa-user" style="width:16px;"></i> Profile</button>
      </div>

      <div class="panel">
        <div id="settingsGeneral">
          <div class="panel-header">
            <div>
              <h3>Institute Details</h3>
              <div class="sub">This information appears across your dashboard</div>
            </div>
          </div>

          <div class="field" style="margin-bottom:18px;">
            <label>Institute logo</label>
            <div style="display:flex; align-items:center; gap:16px; margin-top:6px;">
              <label class="logo-upload" id="logoUploadBox">
                <span id="logoPreview" style="display:contents;">${settings.logo ? `<img src="${settings.logo}" alt="logo">` : `<i class="fa-solid fa-image"></i>`}</span>
                <input type="file" id="logoInput" accept="image/*" class="hidden">
              </label>
              <div style="font-size:.8rem; color:var(--text-muted);">Click the box to upload a logo.<br>UI demo only — stored locally in your browser.</div>
            </div>
          </div>

          <div class="field" style="margin-bottom:18px; max-width:420px;">
            <label for="instituteName">Institute name</label>
            <input type="text" id="instituteName" style="padding-left:14px;" value="${settings.instituteName || ''}">
          </div>

          <button class="btn btn-primary" id="saveGeneralBtn"><i class="fa-solid fa-check"></i> Save Changes</button>
        </div>

        <div id="settingsProfile" class="hidden">
          <div class="panel-header">
            <div>
              <h3>Profile</h3>
              <div class="sub">Update your administrator profile</div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:14px; margin-bottom:20px;">
            <div class="avatar" style="width:56px;height:56px;font-size:1.1rem;">${initials(settings.profileName)}</div>
            <div>
              <div style="font-weight:700;">${settings.profileName}</div>
              <div style="font-size:.8rem; color:var(--text-muted);">Administrator</div>
            </div>
          </div>

          <div class="field" style="margin-bottom:18px; max-width:420px;">
            <label for="profileName">Full name</label>
            <input type="text" id="profileName" style="padding-left:14px;" value="${settings.profileName || ''}">
          </div>

          <button class="btn btn-primary" id="saveProfileBtn"><i class="fa-solid fa-check"></i> Save Profile</button>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.settings-nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.settings-nav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.getAttribute('data-tab');
      document.getElementById('settingsGeneral').classList.toggle('hidden', tab !== 'general');
      document.getElementById('settingsProfile').classList.toggle('hidden', tab !== 'profile');
    });
  });

  const logoInput = document.getElementById('logoInput');
  document.getElementById('logoUploadBox').addEventListener('click', () => logoInput.click());
  logoInput.addEventListener('change', () => {
    const file = logoInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      pendingLogoDataUrl = e.target.result;
      document.getElementById('logoPreview').innerHTML = `<img src="${pendingLogoDataUrl}" alt="logo">`;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('saveGeneralBtn').addEventListener('click', () => {
    const s = getSettings();
    s.instituteName = document.getElementById('instituteName').value.trim() || s.instituteName;
    if (pendingLogoDataUrl) s.logo = pendingLogoDataUrl;
    saveSettings(s);
    showToast('Settings saved', 'Institute details were updated.', 'success');
  });

  document.getElementById('saveProfileBtn').addEventListener('click', () => {
    const s = getSettings();
    s.profileName = document.getElementById('profileName').value.trim() || s.profileName;
    saveSettings(s);
    showToast('Profile saved', 'Your profile was updated.', 'success');
  });
}
