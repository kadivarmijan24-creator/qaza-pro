const PRAYER_KEYS = [
  { id: 'fajr', num: '1', name: 'ફજર', rakat: '૨ ફર્ઝ' },
  { id: 'dhuhr', num: '2', name: 'ઝોહર', rakat: '૪ ફર્ઝ' },
  { id: 'asr', num: '3', name: 'અસર', rakat: '૪ ફર્ઝ' },
  { id: 'maghrib', num: '4', name: 'મગરિબ', rakat: '૩ ફર્ઝ' },
  { id: 'isha', num: '5', name: 'ઈશા', rakat: '૪ ફર્ઝ' },
  { id: 'witr', num: '6', name: 'વિત્ર', rakat: '૩ વાજિબ' }
];

const STORAGE_KEY = 'qaza_pro_pure_v9';

let state = {
  initialTotal: 0,
  dailyPace: 1,
  sound: true,
  historyRecords: {},
  qazaCounts: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0 }
};

let viewingDate = getTodayDateStr();

function getTodayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatToDDMMYYYY(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function getHijriDate(dateObj = new Date()) {
  const hijriMonths = [
    'મુહર્રમ', 'સફર', 'રબીઉલ અવ્વલ', 'રબીઉસ્સાની',
    'જમાદિલ અવ્વલ', 'જમાદિસ્સાની', 'રજબ', 'શાબાન',
    'રમઝાન', 'શવ્વાલ', 'ઝિલકદ', 'ઝિલહિજ્જ'
  ];

  let day = dateObj.getDate();
  let month = dateObj.getMonth();
  let year = dateObj.getFullYear();

  let m = month + 1;
  let y = year;
  if (m < 3) {
    y -= 1;
    m += 12;
  }

  let a = Math.floor(y / 100);
  let b = 2 - a + Math.floor(a / 4);
  let jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524;

  let l = jd - 1948440 + 10632;
  let n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  let j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) + (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238));
  l = l - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
  let hm = Math.floor((24 * l) / 709);
  let hd = l - Math.floor((709 * hm) / 24);
  let hy = 30 * n + j - 30;

  return `${hd} ${hijriMonths[hm - 1]} ${hy} AH`;
}

// Audio & Tactile Haptic Trigger
let audioCtx = null;
function playTouchHaptic(type = 'click') {
  if (navigator.vibrate) {
    if (type === 'click') navigator.vibrate(22);
    else if (type === 'success') navigator.vibrate([30, 50, 30]);
    else if (type === 'missed') navigator.vibrate([50, 40, 50]);
  }

  if (!state.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'click') {
      osc.frequency.setValueAtTime(540, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.06);
    } else if (type === 'success') {
      osc.frequency.setValueAtTime(680, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.14);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.14);
    } else if (type === 'missed') {
      osc.frequency.setValueAtTime(240, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    }
  } catch (e) {}
}

function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      state = { ...state, ...JSON.parse(saved) };
    } catch (e) {}
  }

  ensureDateRecord(viewingDate);
  const hijriEl = document.getElementById('hijri-date-display');
  if (hijriEl) hijriEl.innerText = getHijriDate(new Date());
  renderApp();

  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.classList.add('hidden');
  }, 1200);
}

function ensureDateRecord(dateStr) {
  if (!state.historyRecords[dateStr]) {
    state.historyRecords[dateStr] = {
      fajr: 'pending',
      dhuhr: 'pending',
      asr: 'pending',
      maghrib: 'pending',
      isha: 'pending',
      witr: 'pending'
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderApp();
}

function triggerDatePicker() {
  playTouchHaptic('click');
  const input = document.getElementById('hidden-date-picker');
  if (input && input.showPicker) {
    input.showPicker();
  }
}

function onDateSelected(val) {
  if (!val) return;
  playTouchHaptic('click');
  viewingDate = val;
  ensureDateRecord(viewingDate);
  renderApp();
}

function navigateDay(offset) {
  playTouchHaptic('click');
  const [y, m, d] = viewingDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + offset);
  viewingDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  ensureDateRecord(viewingDate);
  renderApp();
}

function switchTab(tab) {
  playTouchHaptic('click');
  const tabs = ['daily', 'qaza', 'missed'];

  tabs.forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    const panel = document.getElementById(`view-${t}`);
    if (t === tab) {
      if (btn) btn.classList.add('active');
      if (panel) panel.classList.add('active');
    } else {
      if (btn) btn.classList.remove('active');
      if (panel) panel.classList.remove('active');
    }
  });

  if (tab === 'missed') {
    renderMissedLogList();
  }
}

function markOffered(pId) {
  playTouchHaptic('success');
  if (state.historyRecords[viewingDate][pId] === 'missed') {
    if (state.qazaCounts[pId] > 0) state.qazaCounts[pId]--;
  }
  state.historyRecords[viewingDate][pId] = 'offered';
  saveState();
}

function markMissed(pId) {
  playTouchHaptic('missed');
  if (state.historyRecords[viewingDate][pId] !== 'missed') {
    state.qazaCounts[pId]++;
    state.initialTotal++;
  }
  state.historyRecords[viewingDate][pId] = 'missed';
  saveState();
}

function resetStatus(pId) {
  playTouchHaptic('click');
  if (state.historyRecords[viewingDate][pId] === 'missed') {
    if (state.qazaCounts[pId] > 0) state.qazaCounts[pId]--;
  }
  state.historyRecords[viewingDate][pId] = 'pending';
  saveState();
}

function markAllTodayOffered() {
  playTouchHaptic('success');
  PRAYER_KEYS.forEach(p => {
    if (state.historyRecords[viewingDate][p.id] === 'missed') {
      if (state.qazaCounts[p.id] > 0) state.qazaCounts[p.id]--;
    }
    state.historyRecords[viewingDate][p.id] = 'offered';
  });
  saveState();
}

function modifyQaza(pId, delta) {
  if (state.qazaCounts[pId] + delta < 0) return;
  playTouchHaptic(delta > 0 ? 'missed' : 'success');
  state.qazaCounts[pId] += delta;
  const total = Object.values(state.qazaCounts).reduce((a, b) => a + b, 0);
  if (total > state.initialTotal) state.initialTotal = total;
  saveState();
}

function deductWholeDay() {
  const can = PRAYER_KEYS.every(p => state.qazaCounts[p.id] > 0);
  if (!can) {
    alert('કેટલીક નમાઝ ૦ હોવાથી આખો દિવસ બાદ કરી શકાશે નહીં.');
    return;
  }
  playTouchHaptic('success');
  PRAYER_KEYS.forEach(p => state.qazaCounts[p.id]--);
  saveState();
}

function markSingleMissedPrayerDone(dateKey, prayerId) {
  playTouchHaptic('success');
  if (state.historyRecords[dateKey] && state.historyRecords[dateKey][prayerId] === 'missed') {
    state.historyRecords[dateKey][prayerId] = 'offered';
    if (state.qazaCounts[prayerId] > 0) {
      state.qazaCounts[prayerId]--;
    }
    saveState();
  }
}

function renderApp() {
  ensureDateRecord(viewingDate);
  const currentRecord = state.historyRecords[viewingDate];

  document.getElementById('hidden-date-picker').value = viewingDate;
  document.getElementById('visible-date-display').innerText = formatToDDMMYYYY(viewingDate);

  const isToday = viewingDate === getTodayDateStr();
  document.getElementById('selected-date-title').innerText = isToday ? 'આજનો હિસાબ' : `તારીખ: ${formatToDDMMYYYY(viewingDate)}`;

  // 1. Render Daily Prayers with Numbers (1, 2, 3...)
  const dailyBox = document.getElementById('daily-prayers-list');
  dailyBox.innerHTML = '';
  let offeredCount = 0;

  PRAYER_KEYS.forEach(p => {
    const status = currentRecord[p.id];
    if (status === 'offered') offeredCount++;

    const card = document.createElement('div');
    card.className = 'prayer-card';

    let actionHTML = '';
    if (status === 'pending') {
      actionHTML = `
        <div class="btn-action-group">
          <button onclick="markOffered('${p.id}')" class="btn-check">પઢી</button>
          <button onclick="markMissed('${p.id}')" class="btn-cross">કઝા</button>
        </div>`;
    } else if (status === 'offered') {
      actionHTML = `<button onclick="resetStatus('${p.id}')" class="btn-status-badge offered">અદા થઈ ✓</button>`;
    } else {
      actionHTML = `<button onclick="resetStatus('${p.id}')" class="btn-status-badge missed">કઝા થઈ ✕</button>`;
    }

    card.innerHTML = `
      <div class="pc-left">
        <div class="number-badge">${p.num}</div>
        <div>
          <span class="pc-name">${p.name}</span>
          <span class="pc-rakat">${p.rakat}</span>
        </div>
      </div>
      ${actionHTML}
    `;
    dailyBox.appendChild(card);
  });

  document.getElementById('daily-status-title').innerText = `${offeredCount}/૬ અદા થઈ`;
  const percent = Math.round((offeredCount / 6) * 100);
  document.getElementById('daily-ratio-badge').innerText = `${percent}%`;

  // 2. Render Qaza Counter with Numbers (1, 2, 3...)
  const qazaBox = document.getElementById('qaza-cards-container');
  qazaBox.innerHTML = '';
  let totalQaza = 0;

  PRAYER_KEYS.forEach(p => {
    const count = state.qazaCounts[p.id];
    totalQaza += count;

    const row = document.createElement('div');
    row.className = 'prayer-card';
    row.innerHTML = `
      <div class="pc-left">
        <div class="number-badge">${p.num}</div>
        <div>
          <span class="pc-name">${p.name}</span>
          <span class="pc-rakat">${p.rakat}</span>
        </div>
      </div>
      <div class="qc-action-box">
        <button onclick="modifyQaza('${p.id}', 1)" class="qc-btn">+</button>
        <span class="qc-count">${count}</span>
        <button onclick="modifyQaza('${p.id}', -1)" class="qc-btn">-</button>
      </div>
    `;
    qazaBox.appendChild(row);
  });

  document.getElementById('total-qaza-count').innerText = totalQaza.toLocaleString('gu-IN');
  document.getElementById('tab-badge-count').innerText = totalQaza;
  const daysLeft = Math.ceil(totalQaza / 6);
  document.getElementById('total-days-left').innerText = `~ ${daysLeft.toLocaleString('gu-IN')} દિવસની કઝા બાકી`;

  const benchmark = state.initialTotal || totalQaza;
  let qPercent = 0;
  if (benchmark > 0) {
    const done = Math.max(0, benchmark - totalQaza);
    qPercent = Math.min(100, Math.round((done / benchmark) * 100));
  }
  document.getElementById('qaza-percent-badge').innerText = `${qPercent}%`;
  document.getElementById('qaza-ring-progress').style.strokeDashoffset = 163.36 - (163.36 * qPercent) / 100;

  const pace = state.dailyPace || 1;
  if (daysLeft > 0 && pace > 0) {
    const dt = new Date();
    dt.setDate(dt.getDate() + Math.ceil(daysLeft / pace));
    document.getElementById('estimated-date-display').innerText = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  } else {
    document.getElementById('estimated-date-display').innerText = 'અલહમ્દુલિલ્લાહ પૂર્ણ! 🎉';
  }

  renderMissedLogList();
}

function renderMissedLogList() {
  const container = document.getElementById('missed-days-container');
  const analyticsBar = document.getElementById('missed-analytics-bar');
  if (!container) return;

  const datesWithMissed = [];
  const missedStats = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0 };

  Object.keys(state.historyRecords).sort().reverse().forEach(dateKey => {
    const dayRecord = state.historyRecords[dateKey];
    const missedList = [];

    PRAYER_KEYS.forEach(p => {
      if (dayRecord[p.id] === 'missed') {
        missedList.push(p);
        missedStats[p.id]++;
      }
    });

    if (missedList.length > 0) {
      datesWithMissed.push({ date: dateKey, prayers: missedList });
    }
  });

  if (analyticsBar) {
    analyticsBar.innerHTML = PRAYER_KEYS.map(p => `
      <div class="analytics-pill">
        <span>${p.name}:</span>
        <strong>${missedStats[p.id]}</strong>
      </div>
    `).join('');
  }

  if (datesWithMissed.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: #5c7f76; font-size: 0.85rem; background: #ffffff; border-radius: 18px; border: 1px solid #d7e4df; box-shadow: 0 2px 8px rgba(9, 69, 55, 0.03);">
        અલહમ્દુલિલ્લાહ, હાલ કોઈ દિવસની કઝા બાકી નથી!
      </div>
    `;
    return;
  }

  container.innerHTML = datesWithMissed.map(item => `
    <div class="missed-day-card">
      <div class="md-header-row">
        <div class="md-date-tag">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${formatToDDMMYYYY(item.date)}
        </div>
        <span class="md-count-pill">${item.prayers.length} બાકી</span>
      </div>

      <div class="md-prayers-grid">
        ${item.prayers.map(p => `
          <div class="missed-single-item">
            <div class="msi-info">
              <span class="msi-dot"></span>
              <div>
                <span class="msi-name">${p.name}</span>
                <span class="msi-rakat">(${p.rakat})</span>
              </div>
            </div>
            <button onclick="markSingleMissedPrayerDone('${item.date}', '${p.id}')" class="btn-ada-single" title="આ નમાઝ પઢાઈ ગઈ">
              અદા થઈ ✓
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function openModal(id) { 
  playTouchHaptic('click');
  document.getElementById(id).classList.remove('hidden'); 
}

function closeModal(id) { 
  playTouchHaptic('click');
  document.getElementById(id).classList.add('hidden'); 
}

function toggleSound() {
  state.sound = !state.sound;
  playTouchHaptic('click');
  document.getElementById('menu-sound-status').innerText = state.sound ? 'ચાલુ છે' : 'બંધ છે';
  saveState();
}

function saveInitialCalculation() {
  playTouchHaptic('success');
  const y = parseInt(document.getElementById('calc-years').value) || 0;
  const m = parseInt(document.getElementById('calc-months').value) || 0;
  const d = parseInt(document.getElementById('calc-days').value) || 0;
  const pace = parseInt(document.getElementById('calc-pace').value) || 1;

  const total = (y * 365) + (m * 30) + d;
  if (total <= 0) {
    alert('સાચો સમયગાળો દાખલ કરો.');
    return;
  }

  PRAYER_KEYS.forEach(p => state.qazaCounts[p.id] = total);
  state.initialTotal = total * 6;
  state.dailyPace = pace;

  saveState();
  closeModal('setup-modal');
}

function exportData() {
  playTouchHaptic('click');
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `qaza_backup_${formatToDDMMYYYY(getTodayDateStr()).replace(/\//g, '-')}.json`;
  a.click();
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = JSON.parse(evt.target.result);
      if (data.qazaCounts) {
        state = data;
        saveState();
        playTouchHaptic('success');
        alert('ડેટા રિસ્ટોર થઈ ગયો!');
        closeModal('menu-modal');
      }
    } catch (err) {
      alert('અમાન્ય ફાઈલ.');
    }
  };
  reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', init);