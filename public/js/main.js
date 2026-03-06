/* ===== SOUNDBOARD JS ===== */

// --- Theme Toggle ---
const btnDark  = document.getElementById('theme-dark');
const btnLight = document.getElementById('theme-light');

function setTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light');
    btnLight.classList.add('active');
    btnDark.classList.remove('active');
  } else {
    document.body.classList.remove('light');
    btnDark.classList.add('active');
    btnLight.classList.remove('active');
  }
  localStorage.setItem('sb-theme', theme);
}

btnDark.addEventListener('click',  () => setTheme('dark'));
btnLight.addEventListener('click', () => setTheme('light'));
setTheme(localStorage.getItem('sb-theme') || 'dark');


// --- Label Formatter ---
function formatLabel(filename) {
  return filename
    .replace(/\.(wav|mp3)$/i, '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}


// --- Payment Modal ---
const payModal      = document.getElementById('pay-modal');
const payPin        = document.getElementById('pay-pin');
const payError      = document.getElementById('pay-error');
const payModalSound = document.getElementById('pay-modal-sound');
const payConfirm    = document.getElementById('pay-confirm');
const payCancel     = document.getElementById('pay-cancel');

let pendingSfx = null;
let pendingBtn = null;

function openPayModal(file, btn) {
  pendingSfx = file;
  pendingBtn = btn;
  payModalSound.textContent = formatLabel(file);
  payPin.value = '';
  payError.style.display = 'none';
  payModal.style.display = 'flex';
  payPin.focus();
}

function closePayModal() {
  payModal.style.display = 'none';
  if (pendingBtn) {
    pendingBtn.classList.remove('playing');
    pendingBtn = null;
  }
  pendingSfx = null;
}

payCancel?.addEventListener('click', closePayModal);
payModal?.addEventListener('click', (e) => { if (e.target === payModal) closePayModal(); });
payPin?.addEventListener('keydown', (e) => { if (e.key === 'Enter') payConfirm.click(); });

payConfirm?.addEventListener('click', async () => {
  const pin = payPin.value.trim();
  if (!pin) {
    payError.textContent = 'Please enter your PIN.';
    payError.style.display = 'block';
    return;
  }

  payConfirm.disabled = true;
  payConfirm.textContent = 'Processing...';
  payError.style.display = 'none';

  console.log('[Pay] Submitting payment for:', pendingSfx);
  try {
    const res = await fetch('/api/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sfx: pendingSfx, pin })
    });
    console.log('[Pay] Response:', res.status, res.statusText);

    if (res.status === 200) {
      payModal.style.display = 'none';
      if (pendingBtn) {
        pendingBtn.classList.add('playing');
        const played = pendingBtn;
        setTimeout(() => played.classList.remove('playing'), 2000);
      }
      pendingSfx = null;
      pendingBtn = null;
    } else if (res.status === 429) {
      payError.textContent = 'Another sound is already playing. Try again later.';
      payError.style.display = 'block';
      if (pendingBtn) pendingBtn.classList.remove('playing');
    } else {
      const data = await res.json().catch(() => ({}));
      payError.textContent = data.error || 'Payment failed. Please try again.';
      payError.style.display = 'block';
      if (pendingBtn) pendingBtn.classList.remove('playing');
    }
  } catch {
    payError.textContent = 'Network error. Please try again.';
    payError.style.display = 'block';
    if (pendingBtn) pendingBtn.classList.remove('playing');
  } finally {
    payConfirm.disabled = false;
    payConfirm.textContent = 'Pay & Play';
  }
});


// --- Owner Play (no payment) ---
async function ownerPlay(file, btn) {
  const wasPlaying = btn.classList.contains('playing');
  document.querySelectorAll('.sound-btn.playing').forEach(b => b.classList.remove('playing'));
  if (wasPlaying) return;

  btn.classList.add('playing');
  setTimeout(() => btn.classList.remove('playing'), 2000);

  console.log('[Play] Owner play:', file);
  try {
    const res = await fetch('/api/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sfx: file })
    });
    console.log('[Play] Response:', res.status, res.statusText);
    if (res.status === 429) {
      btn.classList.remove('playing');
      alert('Another sound is already playing. Try again later.');
    } else if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('[Play] Error from server:', data);
      btn.classList.remove('playing');
      btn.style.borderColor = 'red';
      setTimeout(() => (btn.style.borderColor = ''), 800);
    }
  } catch (err) {
    console.error('[Play] Network error:', err);
    btn.classList.remove('playing');
    btn.style.borderColor = 'red';
    setTimeout(() => (btn.style.borderColor = ''), 800);
  }
}


// --- Attach Button Logic ---
function attachAudioLogic(btn) {
  const file = btn.dataset.sound;
  if (!file) return;

  let cooldown = false;

  btn.addEventListener('click', () => {
    if (cooldown) return;
    cooldown = true;
    setTimeout(() => { cooldown = false; }, 2000);

    if (window.IS_OWNER) {
      ownerPlay(file, btn);
    } else {
      openPayModal(file, btn);
    }
  });
}


// --- Fetch Sounds from backend ---
function fetchSounds() {
  console.log('[Sounds] Fetching /api/sounds...');
  return fetch('/api/sounds')
    .then(response => {
      console.log('[Sounds] Response status:', response.status, response.statusText);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      console.log('[Sounds] Raw data from server:', data);
      const sfx = data.sfx || [];
      console.log(`[Sounds] ${sfx.length} SFX found:`, sfx);
      return sfx;
    })
    .catch(err => {
      console.error('[Sounds] Failed to fetch sounds:', err);
      return [];
    });
}


// --- Build Sound Grid ---
function buildSoundGrid(sfxList) {
  console.log('[Grid] Building grid with', sfxList.length, 'sounds');
  const grid = document.querySelector('.sound-grid');
  if (!grid) { console.error('[Grid] .sound-grid element not found in DOM!'); return; }

  sfxList
    .filter(filename => filename !== 'disabled')
    .forEach(filename => {
      const btn = document.createElement('button');
      btn.className = 'sound-btn';
      btn.dataset.sound = filename;

      const labelEl = document.createElement('span');
      labelEl.className = 'label';
      labelEl.textContent = formatLabel(filename);

      const barEl = document.createElement('span');
      barEl.className = 'play-bar';

      btn.appendChild(labelEl);
      btn.appendChild(barEl);
      grid.appendChild(btn);

      attachAudioLogic(btn);
    });
}


// --- Search Filter ---
document.getElementById('search').addEventListener('input', function () {
  const q = this.value.trim().toLowerCase();
  document.querySelectorAll('.sound-btn').forEach(btn => {
    const label = btn.querySelector('.label')?.textContent.toLowerCase() || '';
    btn.classList.toggle('hidden', q !== '' && !label.includes(q));
  });
});


// --- Init ---
fetchSounds().then(buildSoundGrid);

