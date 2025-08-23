// app.js
// Voice Characterizer — vanilla JS + Web Speech API

// ---- Character presets (10) ----
const CHARACTERS = [
  {
    id: 'hulk', name: 'Hulk',
    color: 'bg-emerald-600',
    baseRate: 0.9, basePitch: 0.7,
    voiceHints: ['Zira', 'Samantha', 'Google US English', 'en-US']
  },
  {
    id: 'ironman', name: 'Iron Man',
    color: 'bg-red-600',
    baseRate: 1.15, basePitch: 1.0,
    voiceHints: ['Daniel', 'Google UK English Male', 'en-GB', 'en-US']
  },
  {
    id: 'vader', name: 'Darth Vader',
    color: 'bg-slate-800',
    baseRate: 0.85, basePitch: 0.5,
    voiceHints: ['Google UK English Male', 'Alex', 'en-GB', 'en-US']
  },
  {
    id: 'robot', name: 'Robot',
    color: 'bg-cyan-600',
    baseRate: 1.0, basePitch: 1.4,
    voiceHints: ['Google US English', 'en-US', 'en-GB']
  },
  {
    id: 'wizard', name: 'Wizard',
    color: 'bg-indigo-600',
    baseRate: 0.95, basePitch: 1.2,
    voiceHints: ['Victoria', 'en-GB', 'en-US']
  },
  {
    id: 'child', name: 'Child',
    color: 'bg-pink-500',
    baseRate: 1.2, basePitch: 1.6,
    voiceHints: ['Google US English', 'en-US']
  },
  {
    id: 'giant', name: 'Giant',
    color: 'bg-amber-700',
    baseRate: 0.8, basePitch: 0.6,
    voiceHints: ['Alex', 'en-US', 'en-GB']
  },
  {
    id: 'whisper', name: 'Whisper',
    color: 'bg-slate-500',
    baseRate: 0.95, basePitch: 1.1,
    voiceHints: ['Samantha', 'en-US']
  },
  {
    id: 'anchor', name: 'News Anchor',
    color: 'bg-blue-600',
    baseRate: 1.0, basePitch: 0.95,
    voiceHints: ['Daniel', 'Google UK English Male', 'en-GB']
  },
  {
    id: 'alien', name: 'Alien',
    color: 'bg-lime-600',
    baseRate: 1.05, basePitch: 1.8,
    voiceHints: ['Google US English', 'en-US']
  }
];

// ---- DOM ----
const characterGrid = document.getElementById('characterGrid');
const micBtn = document.getElementById('micBtn');
const speakBtn = document.getElementById('speakBtn');
const stopSpeakBtn = document.getElementById('stopSpeakBtn');
const clearBtn = document.getElementById('clearBtn');
const transcriptEl = document.getElementById('transcript');
const statusText = document.getElementById('statusText');
const recDot = document.getElementById('recDot');
const rateSlider = document.getElementById('rate');
const pitchSlider = document.getElementById('pitch');
const rateVal = document.getElementById('rateVal');
const pitchVal = document.getElementById('pitchVal');
const voiceLang = document.getElementById('voiceLang');
const helpBtn = document.getElementById('helpBtn');
const helpDialog = document.getElementById('helpDialog');
const closeHelp = document.getElementById('closeHelp');

// ---- State ----
let selectedCharacter = CHARACTERS[0].id;
let voices = [];
let recognizing = false;
let recognition; // SpeechRecognition instance

// ---- UI helpers ----
function renderCharacters() {
  characterGrid.innerHTML = '';
  CHARACTERS.forEach(ch => {
    const isSelected = ch.id === selectedCharacter;
    const btn = document.createElement('button');
    btn.className = [
      'group relative rounded-xl border border-slate-300 p-3 text-left hover:bg-white active:scale-[.99] transition',
      isSelected ? 'ring-2 ring-brand-400 bg-white' : 'bg-white/80'
    ].join(' ');
    btn.dataset.id = ch.id;

    btn.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg ${ch.color} text-white grid place-items-center font-semibold">
          ${ch.name[0]}
        </div>
        <div>
          <div class="font-medium">${ch.name}</div>
          <div class="text-xs text-slate-500">rate ${ch.baseRate.toFixed(2)}, pitch ${ch.basePitch.toFixed(2)}</div>
        </div>
      </div>
      ${isSelected ? '<div class="absolute top-2 right-2 text-xs text-brand-700">Selected</div>' : ''}
    `;

    btn.addEventListener('click', () => selectCharacter(ch.id));
    characterGrid.appendChild(btn);
  });
}

function selectCharacter(id) {
  selectedCharacter = id;
  renderCharacters();
}

function setStatus(text, active = false) {
  statusText.textContent = text;
  recDot.classList.toggle('bg-rose-500', active);
  recDot.classList.toggle('bg-emerald-500', !active);
}

function updateSliderDisplays() {
  rateVal.textContent = Number(rateSlider.value).toFixed(2);
  pitchVal.textContent = Number(pitchSlider.value).toFixed(2);
}

rateSlider.addEventListener('input', updateSliderDisplays);
pitchSlider.addEventListener('input', updateSliderDisplays);
updateSliderDisplays();

// ---- Speech Synthesis ----
function loadVoices() {
  voices = window.speechSynthesis.getVoices();
}

function pickVoiceForCharacter(ch, langPref) {
  if (!voices || voices.length === 0) return null;
  // Filter by language if selected
  let pool = voices;
  if (langPref && langPref !== 'auto') {
    pool = voices.filter(v => (v.lang || '').startsWith(langPref));
  }
  // Try hinted names first
  for (const hint of ch.voiceHints) {
    const v = pool.find(v => (v.name || '').toLowerCase().includes(hint.toLowerCase()));
    if (v) return v;
  }
  // Fallback: first in pool for selected language, else first overall
  return pool[0] || voices[0] || null;
}

function speak(text) {
  if (!text || !window.speechSynthesis) return;
  const ch = CHARACTERS.find(c => c.id === selectedCharacter) || CHARACTERS[0];
  const utter = new SpeechSynthesisUtterance(text);
  const langPref = voiceLang.value;
  const v = pickVoiceForCharacter(ch, langPref);
  if (v) utter.voice = v;
  if (langPref && langPref !== 'auto') utter.lang = langPref;

  // Combine sliders with character base
  const userRate = Number(rateSlider.value);
  const userPitch = Number(pitchSlider.value);
  utter.rate = clamp(ch.baseRate * userRate, 0.5, 2);
  utter.pitch = clamp(ch.basePitch * userPitch, 0, 2);

  window.speechSynthesis.cancel(); // stop previous
  window.speechSynthesis.speak(utter);
}

function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }

// ---- Speech Recognition ----
function setupRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    setStatus('Speech recognition not supported in this browser');
    micBtn.disabled = true;
    return null;
  }
  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = (navigator.language || 'en-US');

  rec.onstart = () => { recognizing = true; setStatus('Listening…', true); };
  rec.onend = () => { recognizing = false; setStatus('Idle'); };
  rec.onerror = (e) => { setStatus('Error: ' + e.error); };

  rec.onresult = (event) => {
    let interim = '';
    let finalText = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const transcript = res[0].transcript;
      if (res.isFinal) finalText += transcript + ' ';
      else interim += transcript;
    }
    if (finalText) {
      // Check commands first
      if (!handleVoiceCommands(finalText)) {
        transcriptEl.value += (transcriptEl.value ? '\n' : '') + finalText.trim();
      }
    }
  };
  return rec;
}

function toggleMic() {
  if (!recognition) recognition = setupRecognition();
  if (!recognition) return;
  if (recognizing) {
    recognition.stop();
    micBtn.textContent = 'Start Listening';
  } else {
    try {
      recognition.start();
      micBtn.textContent = 'Stop Listening';
    } catch (e) {
      // Some browsers throw if called twice quickly
    }
  }
}

// ---- Voice commands during recognition ----
// Examples:
// "change character to hulk"
// "set rate to 1.2"
// "set pitch to 0.8"
// "speak" / "stop"
function handleVoiceCommands(text) {
  const t = text.toLowerCase();
  // Change character
  const matchChar = t.match(/change\s+character\s+to\s+([a-z\s]+)/);
  if (matchChar) {
    const name = matchChar[1].trim();
    const found = CHARACTERS.find(c => c.name.toLowerCase() === name || c.id === name.replace(/\s+/g, ''));
    if (found) {
      selectCharacter(found.id);
      setStatus(`Character: ${found.name}`);
      return true;
    }
  }
  // Set rate
  const matchRate = t.match(/set\s+rate\s+to\s+([0-9]+(?:\.[0-9]+)?)/);
  if (matchRate) {
    rateSlider.value = clamp(Number(matchRate[1]), 0.5, 2);
    updateSliderDisplays();
    setStatus(`Rate: ${rateSlider.value}`);
    return true;
  }
  // Set pitch
  const matchPitch = t.match(/set\s+pitch\s+to\s+([0-9]+(?:\.[0-9]+)?)/);
  if (matchPitch) {
    pitchSlider.value = clamp(Number(matchPitch[1]), 0, 2);
    updateSliderDisplays();
    setStatus(`Pitch: ${pitchSlider.value}`);
    return true;
  }
  // Speak / Stop
  if (/\b(speak|play|start voice)\b/.test(t)) {
    speak(transcriptEl.value.trim());
    return true;
  }
  if (/\b(stop|silence)\b/.test(t)) {
    window.speechSynthesis.cancel();
    return true;
  }
  return false;
}

// ---- Events ----
micBtn.addEventListener('click', toggleMic);
speakBtn.addEventListener('click', () => speak(transcriptEl.value.trim()));
stopSpeakBtn.addEventListener('click', () => window.speechSynthesis.cancel());
clearBtn.addEventListener('click', () => { transcriptEl.value = ''; });

voiceLang.addEventListener('change', () => {
  // No-op; voice is re-picked on next speak
});

helpBtn.addEventListener('click', () => helpDialog.showModal());
closeHelp.addEventListener('click', () => helpDialog.close());

// ---- Init ----
renderCharacters();

if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

// Small UX improvement: close dialog on backdrop click
helpDialog?.addEventListener('click', (e) => {
  const rect = helpDialog.getBoundingClientRect();
  const inDialog = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inDialog) helpDialog.close();
});
