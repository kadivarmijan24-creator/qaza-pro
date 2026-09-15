const PRAYERS = [
  { id: 'fajr', name: 'ફજર', ar: 'الفجر', rakat: '૨ ફર્ઝ', time24: '05:30', time: '05:30 AM', gradient: 'from-amber-500/15 via-emerald-950/30 to-transparent' },
  { id: 'dhuhr', name: 'ઝોહર', ar: 'الظهر', rakat: '૪ ફર્ઝ', time24: '12:45', time: '12:45 PM', gradient: 'from-amber-400/15 via-emerald-950/30 to-transparent' },
  { id: 'asr', name: 'અસર', ar: 'العصر', rakat: '૪ ફર્ઝ', time24: '16:45', time: '04:45 PM', gradient: 'from-teal-500/15 via-emerald-950/30 to-transparent' },
  { id: 'maghrib', name: 'મગરિબ', ar: 'المغرب', rakat: '૩ ફર્ઝ', time24: '18:50', time: '06:50 PM', gradient: 'from-rose-500/15 via-emerald-950/30 to-transparent' },
  { id: 'isha', name: 'ઈશા', ar: 'العشاء', rakat: '૪ ફર્ઝ', time24: '20:15', time: '08:15 PM', gradient: 'from-indigo-500/15 via-emerald-950/30 to-transparent' },
  { id: 'witr', name: 'વિત્ર', ar: 'الوتر', rakat: '૩ વાજિબ', time24: '20:45', time: '08:45 PM', gradient: 'from-emerald-500/15 via-emerald-950/30 to-transparent' }
];

const MAKRUH_WINDOWS = [
  { name: 'તુલૂ-એ-આફતાબ (સૂર્યોદય)', start: '06:20', end: '06:40', note: 'સૂર્યોદયના ૨૦ મિનિટ સુધી' },
  { name: 'ઝવાલ-એ-આફતાબ (દોપહર)', start: '12:30', end: '12:45', note: 'ઝોહર શરૂ થતાં પહેલાં' },
  { name: 'ગુરૂબ-એ-આફતાબ (સૂર્યાસ્ત)', start: '18:30', end: '18:50', note: 'સૂર્યાસ્તની ૨૦ મિનિટ પહેલાં' }
];

const STORAGE_KEY = 'qaza_pro_royal_v1';

let state = {
  initialTotal: 0,
  dailyPace: 1,
  sound: true,
  historyRecords: {},
  qazaCounts: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0 },
  logs: []
};

let viewingDate = getTodayDateStr();

function getTodayDateStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function format12Hour(date = new Date(), withSeconds = false) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    hour12: true
  });
}

function timeToMinutes(tStr) {
  const [h, m] = tStr.split(':').map(Number);
  return h * 60 + m;
}

// Sound Synthesizer
let audioCtx = null;
function playSound(type = 'click') {
  if (!state.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'click') {
      osc.frequency.setValueAtTime(500, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } else if (type === 'alert') {
      osc.frequency.setValueAtTime(260, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'celebrate') {
      osc.frequency.setValueAtTime(580, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
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
  setInterval(() => {
    updateLiveClockAndNextPrayer();
    checkMakruhWaqt();
  }, 1000);

  updateLiveClockAndNextPrayer();
  checkMakruhWaqt();
  updateSoundUI();
  renderApp();

  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.classList.add('splash-hidden');
    }
  }, 1400);
}

function checkMakruhWaqt() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let activeMakruh = null;
  for (const m of MAKRUH_WINDOWS) {
    const startMin = timeToMinutes(m.start);
    const endMin = timeToMinutes(m.end);
    if (currentMinutes >= startMin && currentMinutes < endMin) {
      activeMakruh = m;
      break;
    }
  }

  const card = document.getElementById('makruh-status-card');
  const iconBox = document.getElementById('makruh-icon-box');
  const icon = document.getElementById('makruh-icon');
  const badge = document.getElementById('makruh-badge');
  const title = document.getElementById('makruh-title');

  if (activeMakruh) {
    card.className = 'rounded-2xl p-3 border transition-all flex items-center justify-between shadow-lg makruh-active animate-pulse';
    iconBox.className = 'w-9 h-9 rounded-xl bg-rose-500/30 text-rose-300 flex items-center justify-center text-base font-bold';
    icon.className = 'ph-bold ph-prohibit';
    badge.className = 'text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-500/40 leading-none';
    badge.innerText = 'મકરુહ વક્ત ચાલુ છે';
    title.innerText = `હાલ ${activeMakruh.name} છે, કઝા ન પઢવી!`;
  } else {
    card.className = 'rounded-2xl p-3 border transition-all flex items-center justify-between shadow-lg makruh-inactive';
    iconBox.className = 'w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-base font-bold';
    icon.className = 'ph-bold ph-shield-check';
    badge.className = 'text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 leading-none';
    badge.innerText = 'કઝા પઢવાનો યોગ્ય વક્ત';
    title.innerText = 'હવે કઝા નમાઝ પઢી શકાય છે';
  }
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

function onDateSelected(selectedDate) {
  if (!selectedDate) return;
  playSound('click');
  viewingDate = selectedDate;
  ensureDateRecord(viewingDate);
  renderApp();
}

function navigateDay(offset) {
  playSound('click');
  const parts = viewingDate.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + offset);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  viewingDate = `${year}-${month}-${day}`;

  ensureDateRecord(viewingDate);
  renderApp();
}

function updateLiveClockAndNextPrayer() {
  const now = new Date();
  document.getElementById('clock-live').innerText = format12Hour(now, true);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let nextP = null;
  let minDiff = Infinity;

  PRAYERS.forEach(p => {
    const [h, m] = p.time24.split(':').map(Number);
    const pMinutes = h * 60 + m;
    const diff = pMinutes - currentMinutes;

    if (diff > 0 && diff < minDiff) {
      minDiff = diff;
      nextP = p;
    }
  });

  let isTomorrow = false;
  if (!nextP) {
    nextP = PRAYERS[0];
    const [h, m] = nextP.time24.split(':').map(Number);
    minDiff = (24 * 60 - currentMinutes) + (h * 60 + m);
    isTomorrow = true;
  }

  const hoursLeft = Math.floor(minDiff / 60);
  const minsLeft = minDiff % 60;
  const secsLeft = 59 - now.getSeconds();

  document.getElementById('next-prayer-name').innerText = `${nextP.name} (${nextP.ar})`;
  document.getElementById('next-prayer-time-badge').innerText = nextP.time;
  document.getElementById('next-prayer-status').innerText = isTomorrow ? 'આવતીકાલે ફજર' : 'વક્ત બાકી';

  const hh = String(hoursLeft).padStart(2, '0');
  const mm = String(minsLeft).padStart(2, '0');
  const ss = String(secsLeft).padStart(2, '0');
  document.getElementById('next-prayer-timer').innerText = `${hh}:${mm}:${ss}`;
}

function switchTab(tab) {
  playSound('click');
  const btnDaily = document.getElementById('tab-daily');
  const btnQaza = document.getElementById('tab-qaza');
  const viewDaily = document.getElementById('view-daily');
  const viewQaza = document.getElementById('view-qaza');

  if (tab === 'daily') {
    viewDaily.classList.remove('hidden');
    viewQaza.classList.add('hidden');
    btnDaily.className = 'py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/60 font-extrabold';
    btnQaza.className = 'py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-white';
  } else {
    viewDaily.classList.add('hidden');
    viewQaza.classList.remove('hidden');
    btnQaza.className = 'py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/60 font-extrabold';
    btnDaily.className = 'py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-white';
  }
}

function markOffered(prayerId) {
  playSound('click');
  if (navigator.vibrate) navigator.vibrate(25);

  const currentStatus = state.historyRecords[viewingDate][prayerId];
  if (currentStatus === 'missed' && state.qazaCounts[prayerId] > 0) {
    state.qazaCounts[prayerId] -= 1;
  }

  state.historyRecords[viewingDate][prayerId] = 'offered';
  logAction(`${viewingDate} • ${getPrayerName(prayerId)} પઢી લીધી`);
  saveState();
}

function markMissed(prayerId) {
  playSound('alert');
  if (navigator.vibrate) navigator.vibrate([40, 60, 40]);

  const currentStatus = state.historyRecords[viewingDate][prayerId];
  if (currentStatus !== 'missed') {
    state.qazaCounts[prayerId] += 1;
    state.initialTotal += 1;
  }

  state.historyRecords[viewingDate][prayerId] = 'missed';
  logAction(`${viewingDate} • ${getPrayerName(prayerId)} કઝા થઈ (+1 ઉમેરાઈ)`);
  saveState();
}

function resetDailyStatus(prayerId) {
  if (state.historyRecords[viewingDate][prayerId] === 'missed' && state.qazaCounts[prayerId] > 0) {
    state.qazaCounts[prayerId] -= 1;
  }
  state.historyRecords[viewingDate][prayerId] = 'pending';
  saveState();
}

function markAllTodayOffered() {
  playSound('celebrate');
  if (navigator.vibrate) navigator.vibrate([30, 40, 30]);

  PRAYERS.forEach(p => {
    if (state.historyRecords[viewingDate][p.id] === 'missed' && state.qazaCounts[p.id] > 0) {
      state.qazaCounts[p.id] -= 1;
    }
    state.historyRecords[viewingDate][p.id] = 'offered';
  });

  logAction(`${viewingDate} • તમામ નમાઝો અદા થઈ!`);
  saveState();

  if (typeof confetti === 'function') {
    confetti({ particleCount: 40, spread: 65, origin: { y: 0.8 }, colors: ['#fbbf24', '#34d399', '#10b981'] });
  }
}

function modifyQaza(prayerId, delta) {
  const current = state.qazaCounts[prayerId] || 0;
  if (current + delta < 0) return;

  playSound('click');
  if (navigator.vibrate) navigator.vibrate(20);

  state.qazaCounts[prayerId] = current + delta;
  const sum = Object.values(state.qazaCounts).reduce((a, b) => a + b, 0);
  if (sum > state.initialTotal) state.initialTotal = sum;

  logAction(`${getPrayerName(prayerId)} કઝા (${delta > 0 ? '+1' : '-1'})`);
  saveState();
  triggerNumberBump(`qaza-val-${prayerId}`);
}

function triggerNumberBump(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.classList.remove('number-pop');
    void el.offsetWidth;
    el.classList.add('number-pop');
  }
}

function deductWholeDay() {
  const canDeduct = PRAYERS.every(p => state.qazaCounts[p.id] > 0);
  if (!canDeduct) {
    alert('કેટલીક નમાઝો ૦ હોવાથી આખો દિવસ બાદ કરી શકાશે નહીં.');
    return;
  }

  playSound('celebrate');
  PRAYERS.forEach(p => state.qazaCounts[p.id] -= 1);
  logAction('૧ આખા દિવસની કઝા બાદ કરી');
  saveState();

  if (typeof confetti === 'function') {
    confetti({ particleCount: 55, spread: 75, origin: { y: 0.8 }, colors: ['#f59e0b', '#10b981', '#14b8a6'] });
  }
}

function logAction(text) {
  const time = format12Hour(new Date());
  state.logs.unshift({
    text,
    time,
    backupCounts: { ...state.qazaCounts },
    backupHistory: JSON.parse(JSON.stringify(state.historyRecords))
  });
  if (state.logs.length > 20) state.logs.pop();
}

function undoLastAction() {
  if (!state.logs.length) return;
  playSound('click');
  const last = state.logs.shift();
  if (last.backupCounts && last.backupHistory) {
    state.qazaCounts = { ...last.backupCounts };
    state.historyRecords = last.backupHistory;
    saveState();
  }
}

function getPrayerName(id) {
  const p = PRAYERS.find(item => item.id === id);
  return p ? p.name : id;
}

function renderApp() {
  ensureDateRecord(viewingDate);
  const currentRecord = state.historyRecords[viewingDate];

  const dateInput = document.getElementById('visible-date-picker');
  if (dateInput) dateInput.value = viewingDate;

  const todayStr = getTodayDateStr();
  const isToday = viewingDate === todayStr;
  document.getElementById('selected-date-title').innerText = isToday 
    ? "આજનો હિસાબ (Today)" 
    : `તારીખ ${viewingDate} નો હિસાબ`;

  const dailyContainer = document.getElementById('daily-prayers-list');
  dailyContainer.innerHTML = '';
  let offeredCount = 0;

  PRAYERS.forEach(p => {
    const status = currentRecord[p.id] || 'pending';
    if (status === 'offered') offeredCount++;

    const card = document.createElement('div');
    card.className = `interactive-touch royal-card rounded-2xl p-4 flex items-center justify-between border border-emerald-500/20 bg-gradient-to-r ${p.gradient}`;

    let actionButtons = '';
    if (status === 'pending') {
      actionButtons = `
        <div class="flex items-center gap-2">
          <button onclick="markOffered('${p.id}')" class="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold active:scale-90 transition-transform flex items-center gap-1 hover:bg-emerald-500/30">
            <i class="ph-bold ph-check text-sm"></i> પઢી
          </button>
          <button onclick="markMissed('${p.id}')" class="px-3.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold active:scale-90 transition-transform flex items-center gap-1 hover:bg-rose-500/30">
            <i class="ph-bold ph-x text-sm"></i> કઝા
          </button>
        </div>
      `;
    } else if (status === 'offered') {
      actionButtons = `
        <button onclick="resetDailyStatus('${p.id}')" class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md shadow-emerald-950/40 active:scale-95 transition-transform">
          <i class="ph-bold ph-check-circle text-sm"></i> અદા થઈ
        </button>
      `;
    } else if (status === 'missed') {
      actionButtons = `
        <button onclick="resetDailyStatus('${p.id}')" class="px-3.5 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 font-bold text-xs flex items-center gap-1 active:scale-95 transition-transform">
          <i class="ph-bold ph-warning-circle text-sm"></i> કઝા ઉમેરાઈ
        </button>
      `;
    }

    card.innerHTML = `
      <div class="flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-2xl bg-[#06110f] border border-emerald-500/30 flex flex-col items-center justify-center shadow-inner">
          <span class="text-xs font-black text-amber-300">${p.ar.slice(0, 3)}</span>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h4 class="font-black text-sm text-white">${p.name}</h4>
            <span class="text-[10px] text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">${p.rakat}</span>
          </div>
          <span class="text-[11px] text-slate-400 font-mono mt-0.5 block">${p.time}</span>
        </div>
      </div>
      ${actionButtons}
    `;
    dailyContainer.appendChild(card);
  });

  document.getElementById('daily-status-title').innerText = `${offeredCount}/૬ અદા થઈ`;
  const dailyPercent = Math.round((offeredCount / 6) * 100);
  document.getElementById('daily-ratio-badge').innerText = `${dailyPercent}%`;

  const qazaContainer = document.getElementById('qaza-cards-container');
  qazaContainer.innerHTML = '';
  let totalQaza = 0;

  PRAYERS.forEach(p => {
    const count = state.qazaCounts[p.id] || 0;
    totalQaza += count;

    const row = document.createElement('div');
    row.className = "interactive-touch royal-card rounded-2xl p-3.5 flex items-center justify-between border border-emerald-500/20";
    row.innerHTML = `
      <div class="flex items-center gap-3.5">
        <div class="w-10 h-10 rounded-xl bg-[#06110f] border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-amber-300">
          ${p.ar.slice(0, 3)}
        </div>
        <div>
          <h4 class="font-black text-sm text-white">${p.name}</h4>
          <span class="text-[11px] text-slate-400">${p.rakat}</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button onclick="modifyQaza('${p.id}', 1)" class="w-9 h-9 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 text-slate-200 flex items-center justify-center border border-emerald-500/20 active:scale-90 transition-transform">
          <i class="ph-bold ph-plus text-xs text-amber-400"></i>
        </button>
        <span id="qaza-val-${p.id}" class="w-10 text-center font-black text-sm text-white font-mono transition-transform inline-block">${count}</span>
        <button onclick="modifyQaza('${p.id}', -1)" class="w-9 h-9 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 flex items-center justify-center border border-amber-400/30 active:scale-90 transition-transform">
          <i class="ph-bold ph-minus text-xs"></i>
        </button>
      </div>
    `;
    qazaContainer.appendChild(row);
  });

  document.getElementById('total-qaza-count').innerText = totalQaza.toLocaleString('gu-IN');
  document.getElementById('tab-badge-count').innerText = totalQaza;
  const daysLeft = Math.ceil(totalQaza / 6);
  document.getElementById('total-days-left').innerText = `~ ${daysLeft.toLocaleString('gu-IN')} દિવસની કઝા બાકી`;

  const benchmark = state.initialTotal || totalQaza;
  let percent = 0;
  if (benchmark > 0) {
    const done = Math.max(0, benchmark - totalQaza);
    percent = Math.min(100, Math.round((done / benchmark) * 100));
  }
  document.getElementById('qaza-percent-badge').innerText = `${percent}%`;
  const offset = 163.36 - (163.36 * percent) / 100;
  document.getElementById('qaza-ring-progress').style.strokeDashoffset = offset;

  const pace = state.dailyPace || 1;
  if (daysLeft > 0 && pace > 0) {
    const daysReq = Math.ceil(daysLeft / pace);
    const est = new Date();
    est.setDate(est.getDate() + daysReq);
    document.getElementById('estimated-date-display').innerText = est.toLocaleDateString('gu-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } else {
    document.getElementById('estimated-date-display').innerText = 'અલહમ્દુલિલ્લાહ પૂર્ણ! 🎉';
  }

  const logBox = document.getElementById('activity-log-box');
  if (!state.logs.length) {
    logBox.innerHTML = '<p class="italic text-slate-500 text-[11px]">કોઈ તાજેતરની નોંધ નથી.</p>';
  } else {
    logBox.innerHTML = state.logs.slice(0, 4).map(l => `
      <div class="flex items-center justify-between text-[11px] border-b border-emerald-500/10 pb-1.5">
        <span class="text-slate-300 truncate max-w-[240px]">${l.text}</span>
        <span class="text-amber-400/80 font-mono text-[10px]">${l.time}</span>
      </div>
    `).join('');
  }
}

function toggleSound() {
  state.sound = !state.sound;
  updateSoundUI();
  saveState();
}

function updateSoundUI() {
  const icon = document.getElementById('sound-icon-menu');
  const txt = document.getElementById('sound-status-menu');
  if (icon && txt) {
    icon.className = state.sound ? 'ph-bold ph-speaker-high' : 'ph-bold ph-speaker-simple-slash text-slate-500';
    txt.innerText = state.sound ? 'ચાલુ છે' : 'બંધ છે';
    txt.className = state.sound ? 'text-[10px] text-emerald-400 font-normal' : 'text-[10px] text-slate-500 font-normal';
  }
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function saveInitialCalculation() {
  const y = parseInt(document.getElementById('calc-years').value) || 0;
  const m = parseInt(document.getElementById('calc-months').value) || 0;
  const d = parseInt(document.getElementById('calc-days').value) || 0;
  const pace = parseInt(document.getElementById('calc-pace').value) || 1;

  const totalDays = (y * 365) + (m * 30) + d;
  if (totalDays <= 0) {
    alert('કૃપા કરીને સાચો સમયગાળો દાખલ કરો.');
    return;
  }

  PRAYERS.forEach(p => state.qazaCounts[p.id] = totalDays);
  state.initialTotal = totalDays * 6;
  state.dailyPace = pace;

  saveState();
  closeModal('setup-modal');
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `qaza_royal_backup_${new Date().toISOString().slice(0, 10)}.json`;
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
        alert('ડેટા સફળતાપૂર્વક લોડ થઈ ગયો!');
        closeModal('menu-modal');
      }
    } catch (err) {
      alert('અમાન્ય ફાઈલ.');
    }
  };
  reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', init);