//  SpeechFix — app.js

// State 
let currentStage  = 0;
let selectedTopic = 'technical';
let selectedDiff  = 'easy';

let micStream    = null;
let audioCtx     = null;
let analyser     = null;
let waveRaf      = null;

let mediaRec     = null;
let audioChunks  = [];
let recSecs      = 0;
let recTick      = null;

// Toast
function toast(msg, ms = 2800) {
  const el = document.createElement('div');
  el.className = 'sf-toast';
  el.textContent = msg;
  document.getElementById('toastStack').appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// Stage navigation
const CONS = ['con-01', 'con-12', 'con-23', 'con-34'];

function goToStage(n) {
  document.getElementById('stage-' + currentStage).classList.remove('active');

  document.querySelectorAll('.stage-step').forEach((s, i) => {
    const node = s.querySelector('.step-node');
    node.classList.remove('active', 'done');
    s.classList.remove('active');
    if (i < n)  node.classList.add('done');
    if (i === n) { node.classList.add('active'); s.classList.add('active'); }
  });

  CONS.forEach((id, i) => {
    const c = document.getElementById(id);
    if (c) c.classList.toggle('done', i < n);
  });

  currentStage = n;
  document.getElementById('stage-' + n).classList.add('active');

  if (n === 1) initMicCheck();
  if (n === 2) fetchQuestion();
  if (n === 3) startRecording();
  if (n === 4) stopMicAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Pill selectors
function setupPills(groupId, cb) {
  document.getElementById(groupId).addEventListener('click', e => {
    const p = e.target.closest('.pill-opt');
    if (!p) return;
    document.querySelectorAll('#' + groupId + ' .pill-opt').forEach(x => x.classList.remove('selected'));
    p.classList.add('selected');
    cb(p.dataset.value);
  });
}

setupPills('topic-group', v => { selectedTopic = v; });
setupPills('diff-group',  v => { selectedDiff  = v; });

document.getElementById('btn-to-mic').addEventListener('click', () => goToStage(1));

// Stage 1 — Mic check + live waveform 
async function initMicCheck() {
  stopMicAll();
  const dot = document.getElementById('mic-dot');
  const txt = document.getElementById('mic-status-text');
  const btn = document.getElementById('btn-to-question');

  dot.className   = 'mic-dot testing';
  txt.textContent = 'Requesting microphone access…';
  btn.disabled    = true;

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
    analyser  = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.82;
    audioCtx.createMediaStreamSource(micStream).connect(analyser);

    dot.className   = 'mic-dot ok';
    txt.textContent = 'Microphone active — speak to see the waveform.';
    btn.disabled    = false;
    drawWave('waveform-mic', true);
    toast('✓ Microphone ready');
  } catch (err) {
    dot.className   = 'mic-dot fail';
    txt.textContent = 'Access denied. Allow microphone and refresh.';
    console.error('Mic access error:', err);
  }
}

function drawWave(canvasId, showVol = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !analyser) return;

  const ctx2d = canvas.getContext('2d');
  const buf   = new Uint8Array(analyser.frequencyBinCount);

  function frame() {
    waveRaf = requestAnimationFrame(frame);
    analyser.getByteTimeDomainData(buf);

    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight || 72;

    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    ctx2d.lineWidth   = 1.8;
    ctx2d.strokeStyle = '#00e5c8';
    ctx2d.shadowBlur  = 8;
    ctx2d.shadowColor = 'rgba(0,229,200,.3)';
    ctx2d.beginPath();

    const sw = canvas.width / buf.length;
    let x = 0;
    for (let i = 0; i < buf.length; i++) {
      const y = (buf[i] / 128) * (canvas.height / 2);
      i === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
      x += sw;
    }
    ctx2d.lineTo(canvas.width, canvas.height / 2);
    ctx2d.stroke();

    if (showVol) {
      let sum = 0;
      buf.forEach(v => sum += Math.abs(v - 128));
      const pct = Math.min(100, (sum / buf.length / 28) * 100).toFixed(1);
      const vf = document.getElementById('vol-fill-mic');
      if (vf) vf.style.width = pct + '%';
    }
  }

  if (waveRaf) cancelAnimationFrame(waveRaf);
  frame();
}

function stopMicAll() {
  if (waveRaf)   { cancelAnimationFrame(waveRaf); waveRaf = null; }
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  if (audioCtx)  { audioCtx.close().catch(() => {}); audioCtx = null; }
  analyser = null;
}

document.getElementById('btn-to-question').addEventListener('click', () => goToStage(2));

//  Stage 2  Fetch question from Gemini via backend 
//  GET /api/v1/questions/generate?topic=X&difficulty=Y
async function fetchQuestion() {
  const loader  = document.getElementById('q-loader');
  const content = document.getElementById('q-content');
  const btn     = document.getElementById('btn-start-rec');

  loader.style.display  = 'flex';
  content.style.display = 'none';
  btn.disabled = true;

  try {
    const res = await fetch(
      `/api/v1/questions/generate?topic=${encodeURIComponent(selectedTopic)}&difficulty=${encodeURIComponent(selectedDiff)}`
    );
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    document.getElementById('q-text').textContent         = data.question;
    document.getElementById('q-hint').textContent         = data.hint || '';
    document.getElementById('q-topic-badge').textContent  = data.topic_label || selectedTopic;

    const db = document.getElementById('q-diff-badge');
    db.textContent = data.difficulty_label || selectedDiff;
    db.className   = 'q-badge ' + selectedDiff;

    loader.style.display  = 'none';
    content.style.display = 'block';
    btn.disabled = false;
    toast('✓ Question ready');
  } catch (err) {
    loader.innerHTML = `<span style="color:var(--danger);font-family:var(--font-mono);font-size:.78rem">
      Failed to load question.
      <a href="#" style="color:var(--cyan)" onclick="fetchQuestion();return false">Retry</a>
    </span>`;
    console.error('fetchQuestion error:', err);
  }
}

document.getElementById('btn-start-rec').addEventListener('click', () => goToStage(3));
document.getElementById('btn-new-q').addEventListener('click', fetchQuestion);

// ── Stage 3 — Recording ───────────────────────────────────────────────
async function startRecording() {
  recSecs     = 0;
  audioChunks = [];
  setTimerDisplay(0);
  recTick = setInterval(() => { recSecs++; setTimerDisplay(recSecs); }, 1000);

  try {
    // Re-acquire mic if the stream was stopped in Stage 1
    if (!micStream || micStream.getTracks().some(t => t.readyState === 'ended')) {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
      analyser  = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.8;
      audioCtx.createMediaStreamSource(micStream).connect(analyser);
    }

    drawWave('waveform-rec', false);

    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4']
                   .find(t => MediaRecorder.isTypeSupported(t)) || '';
    mediaRec = new MediaRecorder(micStream, mime ? { mimeType: mime } : {});
    mediaRec.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRec.start(100);  // collect chunks every 100 ms
  } catch (err) {
    toast('⚠ Microphone unavailable');
    console.error('startRecording error:', err);
    goToStage(1);
  }
}

function setTimerDisplay(secs) {
  const t = String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
  document.getElementById('rec-timer-lg').textContent = t;
  document.getElementById('rec-timer-sm').textContent = t;
}

// bakeBlob now returns a Promise that resolves only AFTER
//  mediaRec.onstop fires. The previous code assigned onstop once at
//  init and called bakeBlob() as a plain function, creating a race where
//  the file input was empty when HTMX submitted the form.
function bakeBlob() {
  return new Promise(resolve => {
    clearInterval(recTick);

    const finish = () => {
      stopMicAll();
      const mime = audioChunks[0]?.type || 'audio/webm';
      const blob = new Blob(audioChunks, { type: mime });
      const ext  = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm';
      const file = new File([blob], `answer.${ext}`, { type: mime });
      const dt   = new DataTransfer();
      dt.items.add(file);
      document.getElementById('audio-file-input').files = dt.files;
      document.getElementById('form-topic').value       = selectedTopic;
      document.getElementById('form-difficulty').value  = selectedDiff;
      resolve();
    };

    if (mediaRec && mediaRec.state !== 'inactive') {
      mediaRec.addEventListener('stop', finish, { once: true });
      mediaRec.stop();
    } else {
      finish();
    }
  });
}

//  await bakeBlob() before navigating to Stage 4 and
//  triggering HTMX submit, so the file input is populated first.
document.getElementById('btn-submit-rec').addEventListener('click', async e => {
  e.preventDefault();
  document.getElementById('btn-submit-rec').disabled = true;

  await bakeBlob();

  // Verify the file was attached before we go anywhere
  const fileInput = document.getElementById('audio-file-input');
  if (!fileInput.files || fileInput.files.length === 0) {
    toast('⚠ No audio recorded — please try again.');
    document.getElementById('btn-submit-rec').disabled = false;
    goToStage(3);
    return;
  }

  goToStage(4);

  // Small delay to let HTMX settle into the DOM before we trigger
  setTimeout(() => htmx.trigger('#rec-form', 'submit'), 150);
});

document.getElementById('btn-discard').addEventListener('click', () => {
  if (mediaRec && mediaRec.state !== 'inactive') mediaRec.stop();
  clearInterval(recTick);
  stopMicAll();
  audioChunks = [];
  goToStage(2);
});

// Stage 4 — After HTMX injects result 
function onAnalysisDone() {
  document.getElementById('submit-htmx-loader').style.display = 'none';
  document.getElementById('btn-submit-rec').disabled = false;
  toast('✓ Analysis complete');

  // Animate SVG score ring after partial is injected
  const ring = document.querySelector('#analysis-result circle[stroke-dasharray]');
  if (ring) {
    const target = ring.getAttribute('stroke-dasharray');
    ring.setAttribute('stroke-dasharray', '0 163.36');
    ring.style.transition = 'stroke-dasharray 1s ease';
    requestAnimationFrame(() => ring.setAttribute('stroke-dasharray', target));
  }
}

function startOver() {
  document.getElementById('analysis-result').innerHTML = '';
  audioChunks = [];
  goToStage(0);
}

// HTMX lifecycle hooks 
document.body.addEventListener('htmx:beforeRequest', () => {
  const l = document.getElementById('submit-htmx-loader');
  if (l) l.style.display = 'block';
});

document.body.addEventListener('htmx:afterSettle', () => {
  const l = document.getElementById('submit-htmx-loader');
  if (l) l.style.display = 'none';
});

// Catch HTMX errors and show a toast instead of silently failing
document.body.addEventListener('htmx:responseError', evt => {
  const status = evt.detail?.xhr?.status;
  toast(`⚠ Server error (${status || '?'}) — please try again.`);
  document.getElementById('btn-submit-rec').disabled = false;
  console.error('HTMX response error:', evt.detail);
});
