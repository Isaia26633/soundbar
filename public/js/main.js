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
const activeAudios = new Set();


// --- Sound Button Logic ---
document.querySelectorAll('.sound-btn').forEach(btn => {
  const file = btn.dataset.sound;
  if (!file) return;

  const audio = new Audio(`/sounds/${file}`);
  const bar = btn.querySelector('.play-bar');

  audio.addEventListener('timeupdate', () => {
    if (audio.duration && bar) {
      bar.style.width = (audio.currentTime / audio.duration * 100) + '%';
    }
  });

  audio.addEventListener('ended', () => {
    btn.classList.remove('playing');
    if (bar) bar.style.width = '0%';
    activeAudios.delete(audio);
  });

  btn.addEventListener('click', () => {
    if (!audio.paused) {
      audio.pause();
      audio.currentTime = 0;
      btn.classList.remove('playing');
      if (bar) bar.style.width = '0%';
      activeAudios.delete(audio);
    } else {
      audio.currentTime = 0;
      audio.play().catch(() => {
        btn.style.borderColor = 'red';
        setTimeout(() => (btn.style.borderColor = ''), 800);
      });
      btn.classList.add('playing');
      activeAudios.add(audio);
    }
  });
});


// --- Search Filter ---
document.getElementById('search').addEventListener('input', function () {
  const q = this.value.trim().toLowerCase();
  document.querySelectorAll('.sound-btn').forEach(btn => {
    const label = btn.querySelector('.label')?.textContent.toLowerCase() || '';
    btn.classList.toggle('hidden', q !== '' && !label.includes(q));
  });
});
