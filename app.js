const PRAYER_KEYS = [
  { id: 'fajr', name: 'ફજર', ar: 'الفجر', rakat: '૨ ફર્ઝ' },
  { id: 'dhuhr', name: 'ઝોહર', ar: 'الظهر', rakat: '૪ ફર્ઝ' },
  { id: 'asr', name: 'અસર', ar: 'العصر', rakat: '૪ ફર્ઝ' },
  { id: 'maghrib', name: 'મગરિબ', ar: 'المغرب', rakat: '૩ ફર્ઝ' },
  { id: 'isha', name: 'ઈશા', ar: 'العشاء', rakat: '૪ ફર્ઝ' },
  { id: 'witr', name: 'વિત્ર', ar: 'الوتر', rakat: '૩ વાજિબ' }
];

const STORAGE_KEY = 'qaza_pro_mint_tabs_v3';

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
        <div class="arabic-tag">${p.ar.slice(0, 3)}</div>
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
        <div class="arabic-tag">${p.ar.slice(0, 3)}</div>
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
        missedList.push(p.name);
      }
    });

    if (missedList.length > 0) {
      datesWithMissed.push({ date: dateKey, prayers: missedList });
    }
  });

  if (datesWithMissed.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: #64748b; font-size: 0.85rem; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
        અલહમ્દુલિલ્લાહ, કોઈપણ દિવસની કઝા નોંધાયેલી નથી!
      </div>
    `;
    return;
  }

  container.innerHTML = datesWithMissed.map(item => `
    <div class="missed-day-row">
      <div>
        <div class="md-date">${formatToDDMMYYYY(item.date)}</div>
        <span style="font-size: 0.65rem; color: #64748b;">${item.prayers.length} નમાઝ છૂટી ગઈ હતી</span>
      </div>
      <div class="md-prayers">
        ${item.prayers.map(p => `<span class="missed-pill">${p}</span>`).join('')}
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