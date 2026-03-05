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


// --- Active Audio Tracking ---


// --- Label Formatter ---
// Strips the file extension and converts the filename into a readable label.
// e.g. "mlgairhorn.wav" -> "Mlgairhorn", "john_cena.wav" -> "John Cena"
function formatLabel(filename) {
  return filename
    .replace(/\.(wav|mp3)$/i, '')  // strip extension
    .replace(/_/g, ' ')            // underscores -> spaces
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase -> words
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}


// --- Attach Audio Logic to a Button ---
function attachAudioLogic(btn) {
  const file = btn.dataset.sound;
  if (!file) return;

  let cooldown = false;

  btn.addEventListener('click', () => {
    if (cooldown) return;

    const wasPlaying = btn.classList.contains('playing');

    // Clear playing state from all buttons
    document.querySelectorAll('.sound-btn.playing').forEach(b => b.classList.remove('playing'));

    if (wasPlaying) return; // second click just clears the highlight

    cooldown = true;
    btn.classList.add('playing');
    setTimeout(() => {
      cooldown = false;
      btn.classList.remove('playing');
    }, 2000);

    fetch('/api/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sfx: file })
    })
    .then(res => {
      if (!res.ok) {
        btn.classList.remove('playing');
        btn.style.borderColor = 'red';
        setTimeout(() => (btn.style.borderColor = ''), 800);
      }
    })
    .catch(() => {
      btn.classList.remove('playing');
      btn.style.borderColor = 'red';
      setTimeout(() => (btn.style.borderColor = ''), 800);
    });
  });
}


// --- Fetch Sounds from backend proxy ---
function fetchSounds() {
  return fetch('/api/sounds')
    .then(response => response.json())
    .then(data => data.sfx || [])
    .catch(err => {
      console.log('connection closed due to errors:', err);
      return [];
    });
}


// --- Build Sound Grid ---
function buildSoundGrid(sfxList) {
  const grid = document.querySelector('.sound-grid');

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
