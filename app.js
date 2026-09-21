const PRAYER_KEYS = [
  { 
    id: 'fajr', 
    name: 'ફજર', 
    rakat: '૨ ફર્ઝ',
    svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="12" cy="14" r="4" fill="#53BDA5" fill-opacity="0.2" stroke="#53BDA5" stroke-width="1.8"/><path d="M12 4V7M5 14H2M22 14H19M6.5 8.5L4.5 6.5M19.5 6.5L17.5 8.5M3 19H21" stroke="#53BDA5" stroke-width="1.8" stroke-linecap="round"/></svg>'
  },
  { 
    id: 'dhuhr', 
    name: 'ઝોહર', 
    rakat: '૪ ફર્ઝ',
    svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="12" cy="12" r="5" fill="#53BDA5" fill-opacity="0.25" stroke="#53BDA5" stroke-width="1.8"/><path d="M12 2V5M12 19V22M2 12H5M19 12H22M4.9 4.9L7 7M17 17L19.1 19.1M4.9 19.1L7 17M17 7L19.1 4.9" stroke="#53BDA5" stroke-width="1.8" stroke-linecap="round"/></svg>'
  },
  { 
    id: 'asr', 
    name: 'અસર', 
    rakat: '૪ ફર્ઝ',
    svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="12" cy="12" r="8" stroke="#53BDA5" stroke-width="1.8"/><polyline points="12 7 12 12 16 14" stroke="#53BDA5" stroke-width="1.8" stroke-linecap="round"/></svg>'
  },
  { 
    id: 'maghrib', 
    name: 'મગરિબ', 
    rakat: '૩ ફર્ઝ',
    svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><path d="M12 16C9 16 7 13.5 7 10C7 6.5 9.5 4 12 3C11 5.5 11.5 8.5 13.5 10.5C15.5 12.5 18.5 13 21 12C20 14.5 17.5 16 14 16H12Z" fill="#53BDA5" fill-opacity="0.2" stroke="#53BDA5" stroke-width="1.8" stroke-linejoin="round"/><path d="M3 20H21" stroke="#53BDA5" stroke-width="2" stroke-linecap="round"/></svg>'
  },
  { 
    id: 'isha', 
    name: 'ઈશા', 
    rakat: '૪ ફર્ઝ',
    svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><path d="M19 13C17.5 17.5 12.5 19.5 8 18C4 16.5 2 12 3.5 8C4.5 5 7 3.5 10 3C9 5 9.5 7.5 11 9.5C12.8 11.8 16 12.5 19 11.5V13Z" fill="#53BDA5" fill-opacity="0.25" stroke="#53BDA5" stroke-width="1.8"/><circle cx="17" cy="5" r="1" fill="#53BDA5"/><circle cx="20" cy="8" r="1" fill="#53BDA5"/></svg>'
  },
  { 
    id: 'witr', 
    name: 'વિત્ર', 
    rakat: '૩ વાજિબ',
    svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><path d="M12 2L15 8.5L22 9.5L17 14.5L18.5 21.5L12 18L5.5 21.5L7 14.5L2 9.5L9 8.5L12 2Z" fill="#53BDA5" fill-opacity="0.2" stroke="#53BDA5" stroke-width="1.8" stroke-linejoin="round"/></svg>'
  }
];

const STORAGE_KEY = 'qaza_pro_mint_tabs_v6';

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

function getCalculatedTimes(dateObj = new Date()) {
  const dayOfYear = Math.floor((dateObj - new Date(dateObj.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  const b = (2 * Math.PI * (dayOfYear - 81)) / 365;
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  const solarNoonMinutes = 12 * 60 + 40 - eot;
  const seasonalVariation = Math.sin((dayOfYear - 80) * (Math.PI / 182)) * 35;

  const sunriseMin = Math.round(6 * 60 + 30 - seasonalVariation);
  const sunsetMin = Math.round(18 * 60 + 35 + seasonalVariation);
  const fajrMin = Math.round(sunriseMin - 75);
  const dhuhrMin = Math.round(solarNoonMinutes);
  const asrMin = Math.round(dhuhrMin + (sunsetMin - dhuhrMin) * 0.62);
  const maghribMin = sunsetMin;
  const ishaMin = Math.round(sunsetMin + 75);
  const witrMin = ishaMin + 25;

  return {
    fajr: minutesToTime12(fajrMin),
    fajrRaw: fajrMin,
    dhuhr: minutesToTime12(dhuhrMin),
    dhuhrRaw: dhuhrMin,
    asr: minutesToTime12(asrMin),
    asrRaw: asrMin,
    maghrib: minutesToTime12(maghribMin),
    maghribRaw: maghribMin,
    isha: minutesToTime12(ishaMin),
    ishaRaw: ishaMin,
    witr: minutesToTime12(witrMin),
    witrRaw: witrMin,
    sunriseRaw: sunriseMin,
    sunsetRaw: sunsetMin
  };
}

function minutesToTime12(totalMinutes) {
  let mins = (totalMinutes + 1440) % 1440;
  let h = Math.floor(mins / 60);
  let m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

let audioCtx = null;
function playBeep(freq = 500, duration = 0.08) {
  if (!state.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
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
  setInterval(updateLiveClockAndPrayerCountdown, 1000);
  updateLiveClockAndPrayerCountdown();
  renderApp();

  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.classList.add('hidden');
  }, 1300);
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
  const input = document.getElementById('hidden-date-picker');
  if (input && input.showPicker) {
    input.showPicker();
  }
}

function onDateSelected(val) {
  if (!val) return;
  viewingDate = val;
  ensureDateRecord(viewingDate);
  renderApp();
}

function navigateDay(offset) {
  const [y, m, d] = viewingDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + offset);
  viewingDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  ensureDateRecord(viewingDate);
  renderApp();
}

function switchTab(tab) {
  playBeep(450, 0.05);
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

function updateLiveClockAndPrayerCountdown() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;

  document.getElementById('clock-live').innerText = 
    `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${ampm}`;

  const currentMinutes = h * 60 + m;
  const solar = getCalculatedTimes(now);

  const timesOrder = [
    { name: 'ફજર', raw: solar.fajrRaw, formatted: solar.fajr },
    { name: 'ઝોહર', raw: solar.dhuhrRaw, formatted: solar.dhuhr },
    { name: 'અસર', raw: solar.asrRaw, formatted: solar.asr },
    { name: 'મગરિબ', raw: solar.maghribRaw, formatted: solar.maghrib },
    { name: 'ઈશા', raw: solar.ishaRaw, formatted: solar.isha },
    { name: 'વિત્ર', raw: solar.witrRaw, formatted: solar.witr }
  ];

  let nextP = timesOrder.find(t => t.raw > currentMinutes);
  let diff = 0;

  if (nextP) {
    diff = nextP.raw - currentMinutes;
    document.getElementById('next-prayer-name').innerText = nextP.name;
    document.getElementById('next-prayer-time-badge').innerText = nextP.formatted;
    document.getElementById('next-prayer-status').innerText = 'સાચો વક્ત';
  } else {
    diff = (1440 - currentMinutes) + solar.fajrRaw;
    document.getElementById('next-prayer-name').innerText = 'ફજર';
    document.getElementById('next-prayer-time-badge').innerText = solar.fajr;
    document.getElementById('next-prayer-status').innerText = 'આવતીકાલે';
  }

  const diffHours = Math.floor(diff / 60);
  const diffMins = diff % 60;
  const diffSecs = 59 - s;
  document.getElementById('next-prayer-timer').innerText = 
    `${String(diffHours).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}:${String(diffSecs).padStart(2, '0')}`;

  checkMakruhStatus(currentMinutes, solar);
}

function checkMakruhStatus(currentMin, solar) {
  const m1 = currentMin >= solar.sunriseRaw && currentMin <= (solar.sunriseRaw + 20);
  const m2 = currentMin >= (solar.dhuhrRaw - 15) && currentMin <= solar.dhuhrRaw;
  const m3 = currentMin >= (solar.sunsetRaw - 20) && currentMin <= solar.sunsetRaw;

  const card = document.getElementById('makruh-card');
  const badge = document.getElementById('makruh-badge');
  const title = document.getElementById('makruh-title');

  if (m1 || m2 || m3) {
    card.className = 'makruh-card active';
    badge.innerText = 'મકરુહ વક્ત ચાલુ છે';
    title.innerText = 'હાલ નમાઝ પઢવી મનાઈ છે!';
  } else {
    card.className = 'makruh-card normal';
    badge.innerText = 'કઝા પઢવાનો વક્ત';
    title.innerText = 'હવે કઝા નમાઝ પઢી શકાય છે';
  }
}

function markOffered(pId) {
  playBeep(650, 0.08);
  if (state.historyRecords[viewingDate][pId] === 'missed') {
    if (state.qazaCounts[pId] > 0) state.qazaCounts[pId]--;
  }
  state.historyRecords[viewingDate][pId] = 'offered';
  saveState();
}

function markMissed(pId) {
  playBeep(240, 0.15);
  if (state.historyRecords[viewingDate][pId] !== 'missed') {
    state.qazaCounts[pId]++;
    state.initialTotal++;
  }
  state.historyRecords[viewingDate][pId] = 'missed';
  saveState();
}

function resetStatus(pId) {
  if (state.historyRecords[viewingDate][pId] === 'missed') {
    if (state.qazaCounts[pId] > 0) state.qazaCounts[pId]--;
  }
  state.historyRecords[viewingDate][pId] = 'pending';
  saveState();
}

function markAllTodayOffered() {
  playBeep(700, 0.15);
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
  playBeep(delta > 0 ? 550 : 450, 0.06);
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
  playBeep(800, 0.2);
  PRAYER_KEYS.forEach(p => state.qazaCounts[p.id]--);
  saveState();
}

function markSingleMissedPrayerDone(dateKey, prayerId) {
  playBeep(750, 0.15);
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

  const [y, m, d] = viewingDate.split('-').map(Number);
  const solarOfDate = getCalculatedTimes(new Date(y, m - 1, d));

  const dailyBox = document.getElementById('daily-prayers-list');
  dailyBox.innerHTML = '';
  let offeredCount = 0;

  PRAYER_KEYS.forEach(p => {
    const status = currentRecord[p.id];
    if (status === 'offered') offeredCount++;

    const dynamicTime = solarOfDate[p.id];
    const card = document.createElement('div');
    card.className = 'prayer-card';

    let actionHTML = '';
    if (status === 'pending') {
      actionHTML = `
        <div class="btn-action-group">
          <button onclick="markOffered('${p.id}')" class="btn-check">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            પઢી
          </button>
          <button onclick="markMissed('${p.id}')" class="btn-cross">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            કઝા
          </button>
        </div>`;
    } else if (status === 'offered') {
      actionHTML = `
        <button onclick="resetStatus('${p.id}')" class="btn-status-badge offered">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>
          અદા થઈ
        </button>`;
    } else {
      actionHTML = `
        <button onclick="resetStatus('${p.id}')" class="btn-status-badge missed">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          કઝા થઈ
        </button>`;
    }

    card.innerHTML = `
      <div class="pc-left">
        <div class="prayer-badge-icon">${p.svg}</div>
        <div>
          <div class="pc-title-row">
            <h4 class="pc-name">${p.name}</h4>
            <span class="pc-rakat">${p.rakat}</span>
          </div>
          <span class="pc-time-dynamic">${dynamicTime}</span>
        </div>
      </div>
      ${actionHTML}
    `;
    dailyBox.appendChild(card);
  });

  document.getElementById('daily-status-title').innerText = `${offeredCount}/૬ અદા થઈ`;
  const percent = Math.round((offeredCount / 6) * 100);
  document.getElementById('daily-ratio-badge').innerText = `${percent}%`;

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
        <div class="prayer-badge-icon">${p.svg}</div>
        <div>
          <h4 class="pc-name">${p.name}</h4>
          <span class="pc-time-dynamic">${p.rakat}</span>
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
  if (!container) return;

  const datesWithMissed = [];

  Object.keys(state.historyRecords).sort().reverse().forEach(dateKey => {
    const dayRecord = state.historyRecords[dateKey];
    const missedList = [];

    PRAYER_KEYS.forEach(p => {
      if (dayRecord[p.id] === 'missed') {
        missedList.push(p);
      }
    });

    if (missedList.length > 0) {
      datesWithMissed.push({ date: dateKey, prayers: missedList });
    }
  });

  if (datesWithMissed.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: #497167; font-size: 0.85rem; background: #ffffff; border-radius: 18px; border: 1px solid #c9eee5; box-shadow: 0 2px 8px rgba(83, 189, 165, 0.05);">
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
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              અદા થઈ
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function toggleSound() {
  state.sound = !state.sound;
  document.getElementById('menu-sound-status').innerText = state.sound ? 'ચાલુ છે' : 'બંધ છે';
  saveState();
}

function saveInitialCalculation() {
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
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `qaza_pro_backup_${formatToDDMMYYYY(getTodayDateStr()).replace(/\//g, '-')}.json`;
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