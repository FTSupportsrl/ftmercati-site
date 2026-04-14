// ═══════ TOAST NOTIFICATION ═══════
function showToast(msg, type) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px 24px;font-size:14px;font-weight:600;box-shadow:var(--shadow-lg);z-index:300;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1);font-family:var(--font);';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.borderColor = type === 'error' ? 'var(--negative)' : type === 'success' ? 'var(--positive)' : 'var(--accent)';
  t.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(100px)'; }, 2500);
}

// ═══════ STATE ═══════
let isLoggedIn = false;
let currentLoginTab = 'login';
let currentPublicPage = 'home';
let currentARPage = 'account';
let currentLMESource = 'EL';
let currentPreziosiMode = 'spot';
let currentForexSource = 'BCE';
let currentRottamiGroup = 'FER';
let currentUsername = '';
let currentDisplayName = '';

// ═══════ THEME ═══════
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.querySelectorAll('#themeIcon, .theme-toggle').forEach(el => {
    el.textContent = isDark ? '☀️' : '🌙';
  });
}

// ═══════ PUBLIC NAVIGATION ═══════
function goPublicPage(page) {
  if (isLoggedIn) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-link-public').forEach(l => {
    l.classList.toggle('active', l.getAttribute('data-page') === page);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  currentPublicPage = page;
  if (page === 'news') renderNews('all');
}

// ═══════ AREA RISERVATA NAVIGATION ═══════
function goARPage(page) {
  if (!isLoggedIn) return;
  document.querySelectorAll('.ar-page').forEach(p => p.classList.remove('active'));
  document.getElementById('ar-page-' + page).classList.add('active');
  document.querySelectorAll('.ar-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page || (page === 'account' && item.textContent.includes('Home')));
  });
  currentARPage = page;

  if (page === 'lme') renderLMETable();
  else if (page === 'preziosi') renderPreziosiTable();
  else if (page === 'forex') renderForexTable();
  else if (page === 'energia') renderEnergiaTable();
  else if (page === 'rottami') renderRottamiTable();
  else if (page === 'alerts') renderAlerts();
  else if (page === 'preferiti') renderPreferiti();
  else if (page === 'news') filterNewsAR('all', document.querySelector('#ar-page-news .chart-period'));
}

function toggleARSubmenu(btn) {
  btn.classList.toggle('expanded');
  btn.nextElementSibling.classList.toggle('show');
}

// ═══════ LOGIN SYSTEM ═══════
function showLogin(tab) {
  document.getElementById('loginOverlay').classList.add('show');
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('loginSuccess').style.display = 'none';
  if (tab) switchLoginTab(tab);
}

function hideLogin() {
  document.getElementById('loginOverlay').classList.remove('show');
}

document.getElementById('loginOverlay').addEventListener('click', function(e) {
  if (e.target === this) hideLogin();
});

// Enter key per submit login
['loginUsername', 'loginPassword'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); handleLogin(); }
  });
});

function switchLoginTab(tab) {
  currentLoginTab = tab;
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('registerFields').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('loginRemember').style.display = tab === 'login' ? 'flex' : 'none';
  document.getElementById('loginSubmitBtn').textContent = tab === 'login' ? 'Accedi' : 'Crea Account';
  document.getElementById('loginFooter').innerHTML = tab === 'login'
    ? 'Non hai un account? <a onclick="switchLoginTab(\'register\')">Registrati</a>'
    : 'Hai gia un account? <a onclick="switchLoginTab(\'login\')">Accedi</a>';
}

// ═══════ PASSWORD TOGGLE ═══════
function togglePasswordVisibility() {
  const pwInput = document.getElementById('loginPassword');
  const btn = document.getElementById('togglePwBtn');
  if (pwInput.type === 'password') {
    pwInput.type = 'text';
    btn.textContent = 'NASCONDI';
    btn.title = 'Nascondi password';
  } else {
    pwInput.type = 'password';
    btn.textContent = 'MOSTRA';
    btn.title = 'Mostra password';
  }
}

// ═══════ API CONFIG ═══════
// In produzione: chiamate dirette al server. In locale: proxy via ftmercati_server.py
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? '/'
  : 'https://service.ftmercati.com/';
let currentUser = null;
let authToken = null;

function showLoginError(msg) {
  let errEl = document.getElementById('loginError');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.id = 'loginError';
    errEl.style.cssText = 'background:var(--negative-bg);color:var(--negative);padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:12px;display:none;';
    const submitBtn = document.getElementById('loginSubmitBtn');
    submitBtn.parentNode.insertBefore(errEl, submitBtn);
  }
  errEl.textContent = msg;
  errEl.style.display = 'block';
}

function hideLoginError() {
  const errEl = document.getElementById('loginError');
  if (errEl) errEl.style.display = 'none';
}

async function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username) { showLoginError('Inserisci lo username'); return; }
  if (!password) { showLoginError('Inserisci la password'); return; }

  hideLoginError();
  const submitBtn = document.getElementById('loginSubmitBtn');
  const origText = submitBtn.textContent;
  submitBtn.textContent = 'Connessione...';
  submitBtn.disabled = true;

  try {
    const encodedUser = encodeURIComponent(username);
    const encodedPw = encodeURIComponent(password);
    const url = API_BASE + 'api/login?username=' + encodedUser + '&pw=' + encodedPw + '&check=false';

    console.log('[Login] Tentativo login per utente: ' + username);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Errore server: ' + response.status);
    }

    const text = await response.text();
    console.log('[Login] Risposta raw:', text);

    // Risposta vuota = credenziali errate
    if (!text || text.trim() === '' || text.trim() === 'null') {
      showLoginError('Username o password non validi');
      submitBtn.textContent = origText;
      submitBtn.disabled = false;
      return;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error('[Login] Errore parsing JSON:', parseErr);
      showLoginError('Risposta non valida dal server');
      submitBtn.textContent = origText;
      submitBtn.disabled = false;
      return;
    }

    console.log('[Login] Risposta ricevuta:', JSON.stringify(data));

    // Controlla se l'utente è bloccato
    if (data.Bloccato === true) {
      const motivo = data.MotivoBlocco || 'Account bloccato';
      showLoginError(motivo);
      submitBtn.textContent = origText;
      submitBtn.disabled = false;
      return;
    }

    // Controlla se c'è un UserId valido (login riuscito)
    if (!data.UserId && !data.ProviderKey) {
      showLoginError('Credenziali non valide');
      submitBtn.textContent = origText;
      submitBtn.disabled = false;
      return;
    }

    // Login riuscito!
    currentUser = data;
    authToken = data.ProviderKey || null;
    currentUsername = username;
    currentDisplayName = username; // L'utente puo cambiarlo nelle impostazioni

    console.log('[Login] Login riuscito per utente: ' + username);
    console.log('[Login] Servizi: Base=' + data.Servizio_base + ', Standard=' + data.Servizio_standard + ', Premium=' + data.Servizio_premium + ', Leghe=' + data.Servizio_leghe + ', Report=' + data.Servizio_report + ', Alert=' + data.Servizio_Alert + ', App=' + data.Servizio_app);

    // Mostra lo username nell'header AR
    const userBadge = document.querySelector('.ar-user-badge');
    if (userBadge) userBadge.innerHTML = '<strong>' + username + '</strong>';

    // Aggiorna dashboard
    updateDashboard(data, currentDisplayName);

    performLogin('Accesso effettuato!', 'Bentornato, ' + currentDisplayName + '!');

  } catch (err) {
    console.error('[Login] Errore:', err);
    console.log('[Login] Connessione al server non riuscita — attivo modalita demo automatica');
    hideLoginError();
    submitBtn.textContent = origText;
    submitBtn.disabled = false;
    demoLogin();
  }
}

function demoLogin() {
  currentUser = {
    UserId: 'DemoUser',
    Bloccato: false,
    MotivoBlocco: null,
    ProviderKey: 'demo-token-12345',
    Servizio_base: true,
    Servizio_standard: true,
    Servizio_premium: true,
    Servizio_leghe: true,
    Servizio_report: true,
    Servizio_Alert: true,
    Servizio_app: true,
    Livello: 'Premium',
    Markets: 'LME,Preziosi,Forex,Energia,Rottami,SHFE',
    Reports: 'Daily,Weekly',
    Data_attivazione: '2025-01-01',
    Data_scadenza: '2027-12-31',
    In_prova: false,
    RataScaduta: false
  };
  authToken = 'demo-token-12345';
  currentUsername = 'demo';
  currentDisplayName = 'Tommaso';
  const userBadge = document.querySelector('.ar-user-badge');
  if (userBadge) userBadge.innerHTML = '<strong>demo</strong> <span style="background:var(--accent);color:white;padding:2px 8px;border-radius:8px;font-size:11px;margin-left:6px;">DEMO</span>';
  updateDashboard(currentUser, currentDisplayName);
  const connEl = document.getElementById('connStatus');
  if (connEl) { connEl.className = 'connection-status demo'; connEl.innerHTML = '<span class="dot" style="background:var(--warning);"></span> Demo'; }
  performLogin('Accesso Demo', 'Bentornato, ' + currentDisplayName + '!');
}

function performLogin(title, msg) {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('loginSuccess').style.display = 'block';
  document.getElementById('successTitle').textContent = title;
  document.getElementById('successMsg').textContent = msg;
  const submitBtn = document.getElementById('loginSubmitBtn');
  submitBtn.disabled = false;
  submitBtn.textContent = currentLoginTab === 'login' ? 'Accedi' : 'Crea Account';
  isLoggedIn = true;
  setTimeout(() => {
    hideLogin();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('topbar').classList.add('hidden');
    document.getElementById('navPublic').classList.add('hidden');
    document.getElementById('main').classList.add('hidden');
    document.getElementById('mainFooter').classList.add('hidden');
    document.getElementById('arHeader').classList.remove('hidden');
    document.getElementById('arContainer').classList.remove('hidden');
    document.getElementById('ar-page-account').classList.add('active');
    renderLMETable();
    renderPreziosiTable();
    renderForexTable();
    renderEnergiaTable();
    renderRottamiTable();
    renderAlerts();
    renderPreferiti();
    filterNewsAR('all', document.querySelector('#ar-page-news .chart-period'));
    setTimeout(drawAllCharts, 100);
    drawSparkline('sparkCu', 9400, 50, 'var(--accent)');
    drawSparkline('sparkAl', 2380, 20, 'var(--accent)');
    drawSparkline('sparkGold', 2340, 15, '#F0B90B');
    drawSparkline('sparkEur', 1.08, 0.003, 'var(--accent)');
    drawSparkline('sparkBrent', 82, 1.5, '#E67E22');
    drawSparkline('sparkScrap', 430, 5, '#7F8C8D');
    const connEl = document.getElementById('connStatus');
    if (connEl) { connEl.className = 'connection-status online'; connEl.innerHTML = '<span class="dot" style="background:var(--positive);"></span> Live'; }
  }, 1500);
}

function handleLogout() {
  isLoggedIn = false;
  currentUser = null;
  authToken = null;
  currentUsername = '';
  currentDisplayName = '';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  hideLoginError();
  showToast('Sessione terminata', 'info');
  console.log('[Logout] Sessione terminata');
  document.getElementById('topbar').classList.remove('hidden');
  document.getElementById('navPublic').classList.remove('hidden');
  document.getElementById('main').classList.remove('hidden');
  document.getElementById('mainFooter').classList.remove('hidden');
  document.getElementById('arHeader').classList.add('hidden');
  document.getElementById('arContainer').classList.add('hidden');
  goPublicPage('home');
}

// ═══════ DASHBOARD UPDATE ═══════
function updateDashboard(data, displayName) {
  const title = document.querySelector('#ar-page-account .page-title');
  if (title) title.textContent = 'Dashboard';
  const welcome = document.getElementById('dashWelcome');
  if (welcome) welcome.textContent = 'Bentornato, ' + displayName + ' — panoramica dei mercati e dei tuoi servizi';
  const livello = document.getElementById('dashLivello');
  if (livello) livello.textContent = data.Livello || 'Base';
  const scadenza = document.getElementById('dashScadenza');
  if (scadenza && data.Data_scadenza) {
    const d = new Date(data.Data_scadenza);
    scadenza.textContent = 'Scadenza: ' + d.toLocaleDateString('it-IT');
  }
  const stato = document.getElementById('dashStato');
  if (stato) {
    const isActive = !data.RataScaduta && !data.Bloccato;
    stato.textContent = isActive ? 'Attivo' : 'Scaduto';
    stato.className = 'dash-status ' + (isActive ? 'active' : 'inactive');
  }
  // Servizi
  const serviziEl = document.getElementById('dashServizi');
  if (serviziEl) {
    const servizi = [
      { key: 'Servizio_base', label: 'Base' },
      { key: 'Servizio_standard', label: 'Standard' },
      { key: 'Servizio_premium', label: 'Premium' },
      { key: 'Servizio_leghe', label: 'Leghe' },
      { key: 'Servizio_report', label: 'Report' },
      { key: 'Servizio_Alert', label: 'Alert' }
    ];
    serviziEl.innerHTML = servizi.map(s => {
      const on = data[s.key];
      return '<div style="font-size:12px;padding:6px 10px;border-radius:6px;background:' +
        (on ? 'rgba(81,175,64,0.1);color:var(--positive)' : 'rgba(239,68,68,0.1);color:var(--negative)') +
        ';font-weight:600;">' + s.label + (on ? '' : ' (no)') + '</div>';
    }).join('');
  }
}

// ═══════ DISPLAY NAME EDITOR ═══════
function openDisplayNameEditor() {
  const overlay = document.getElementById('nameEditorOverlay');
  const input = document.getElementById('displayNameInput');
  input.value = currentDisplayName;
  overlay.classList.add('active');
  input.focus();
  input.select();
}

function closeNameEditor() {
  document.getElementById('nameEditorOverlay').classList.remove('active');
}

function saveDisplayName() {
  const input = document.getElementById('displayNameInput');
  const newName = input.value.trim();
  if (!newName) { showToast('Inserisci un nome', 'error'); return; }
  currentDisplayName = newName;
  // Aggiorna welcome dashboard
  const welcome = document.getElementById('dashWelcome');
  if (welcome) welcome.textContent = 'Bentornato, ' + currentDisplayName + ' — panoramica dei mercati e dei tuoi servizi';
  // Aggiorna header badge (mantiene username, non displayName)
  closeNameEditor();
  showToast('Nome aggiornato: ' + currentDisplayName, 'success');
  console.log('[Profilo] Display name aggiornato a: ' + currentDisplayName);
}

// ═══════ TICKER DATA ═══════
const tickerData = [
  { name: 'CU 3M', price: '9,412.50', change: '+1.24%', up: true },
  { name: 'AL 3M', price: '2,387.00', change: '-0.38%', up: false },
  { name: 'ZN 3M', price: '2,845.50', change: '+0.67%', up: true },
  { name: 'NI 3M', price: '16,250.00', change: '-1.12%', up: false },
  { name: 'PB 3M', price: '2,102.00', change: '+0.31%', up: true },
  { name: 'SN 3M', price: '28,950.00', change: '-0.22%', up: false },
  { name: 'XAU SPOT', price: '2,438.60', change: '+0.85%', up: true },
  { name: 'XAG SPOT', price: '31.24', change: '+1.52%', up: true },
  { name: 'EUR/USD', price: '1.0847', change: '+0.12%', up: true },
  { name: 'BRENT', price: '82.45', change: '-0.54%', up: false },
  { name: 'NI 3M', price: '16,250.00', change: '-1.12%', up: false },
  { name: 'XPT', price: '1,028.40', change: '+0.32%', up: true },
  { name: 'XPD', price: '968.50', change: '-0.87%', up: false },
  { name: 'PUN', price: '87.45', change: '+2.15%', up: true },
  { name: 'GAS TTF', price: '28.90', change: '-0.68%', up: false },
];

(function buildTicker() {
  const strip = document.getElementById('ticker');
  const html = tickerData.map(d => `<div class="ticker-item"><span class="ticker-name">${d.name}</span><span class="ticker-price">${d.price}</span><span class="ticker-change ${d.up?'up':'down'}">${d.change}</span></div>`).join('');
  strip.innerHTML = html + html;
})();

// ═══════ MARKET CARDS ═══════
const allMarkets = [
  { cat:'lme', name:'LME Metalli', sub:'CU, AL, ZN, NI, PB, SN', price:'9,412.50', unit:'USD/t (CU 3M)', change:'+1.24%', up:true, icon:'📊', color:'#51AF40' },
  { cat:'preziosi', name:'Preziosi', sub:'Au, Ag, Pt, Pd', price:'2,438.60', unit:'USD/oz (XAU)', change:'+0.85%', up:true, icon:'✨', color:'#F1C40F' },
  { cat:'altro', name:'Rottami', sub:'Ferrosi & Non Ferrosi', price:'430-460', unit:'EUR/t', change:'+0.45%', up:true, icon:'♻️', color:'#E67E22' },
  { cat:'altro', name:'Report', sub:'Analisi giornaliere', price:'2,400+', unit:'Pubblicati', change:'', up:true, icon:'📄', color:'#4F6BF6' },
  { cat:'altro', name:'Leghe', sub:'1.240+ composizioni', price:'1,240+', unit:'Nel database', change:'', up:true, icon:'⛓️', color:'#9B59B6' },
  { cat:'lme', name:'LME Indici', sub:'LMEX & Sub-indici', price:'3,847.20', unit:'Index', change:'+0.38%', up:true, icon:'📈', color:'#3498DB' },
  { cat:'forex', name:'FOREX', sub:'Spot & Fixing', price:'1.0847', unit:'EUR/USD', change:'+0.12%', up:true, icon:'💱', color:'#035177' },
  { cat:'energia', name:'Petrolio', sub:'Brent, WTI, Gasolio', price:'82.45', unit:'USD/bbl', change:'-0.54%', up:false, icon:'🛢️', color:'#2C3E50' },
];

function generateSparkline(isUp) {
  const pts = []; let y = isUp ? 35 : 15;
  for(let i=0; i<=20; i++) { y += (Math.random() - (isUp ? 0.35 : 0.65)) * 6; y = Math.max(4, Math.min(44, y)); pts.push({x: i*12, y}); }
  const line = 'M' + pts.map(p => `${p.x},${p.y}`).join(' L');
  return { line, area: line + ' L240,48 L0,48 Z' };
}

function renderMarkets(filter) {
  const data = filter === 'all' ? allMarkets : allMarkets.filter(m => m.cat === filter);
  document.getElementById('marketsGrid').innerHTML = data.map((m,i) => {
    const s = generateSparkline(m.up);
    return `<div class="market-card" onclick="goPublicPage('home')">
      <div class="market-card-header">
        <div class="market-card-icon" style="background:${m.color}15;color:${m.color};">${m.icon}</div>
      </div>
      <div class="market-card-name">${m.name}</div>
      <div class="market-card-sub">${m.sub}</div>
      <div class="market-card-price">${m.price}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11px;color:var(--text-tertiary);">${m.unit}</span>
        <span class="market-card-change ${m.up?'up':'down'}">${m.up?'▲':'▼'} ${m.change}</span>
      </div>
    </div>`;
  }).join('');
}

renderMarkets('all');

// ═══════ DATA MODELS ═══════
const lmeData = {
  EL: [
    { symbol:'CU', metal:'Rame', color:'#E67E22', C:'9,398.00', M3:'9,412.50', M15:'9,480.00', M27:'9,530.00', change:'+115.50', changePerc:'+1.24', bid:'9,410.00', ask:'9,415.00', volume:'12,450' },
    { symbol:'AL', metal:'Alluminio', color:'#51AF40', C:'2,365.00', M3:'2,387.00', M15:'2,425.00', M27:'2,458.00', change:'-9.00', changePerc:'-0.38', bid:'2,385.50', ask:'2,388.50', volume:'28,320' },
    { symbol:'ZN', metal:'Zinco', color:'#3498DB', C:'2,830.00', M3:'2,845.50', M15:'2,880.00', M27:'2,910.00', change:'+18.75', changePerc:'+0.67', bid:'2,844.00', ask:'2,847.00', volume:'8,900' },
    { symbol:'NI', metal:'Nichel', color:'#9B59B6', C:'16,200.00', M3:'16,250.00', M15:'16,420.00', M27:'16,580.00', change:'-184.00', changePerc:'-1.12', bid:'16,240.00', ask:'16,260.00', volume:'5,670' },
    { symbol:'PB', metal:'Piombo', color:'#7F8C8D', C:'2,095.00', M3:'2,102.00', M15:'2,118.00', M27:'2,130.00', change:'+6.50', changePerc:'+0.31', bid:'2,100.00', ask:'2,104.00', volume:'3,210' },
    { symbol:'SN', metal:'Stagno', color:'#1ABC9C', C:'28,900.00', M3:'28,950.00', M15:'29,100.00', M27:'29,250.00', change:'-64.00', changePerc:'-0.22', bid:'28,940.00', ask:'28,960.00', volume:'1,840' },
  ],
  RK: [
    { symbol:'CU', metal:'Rame', color:'#E67E22', C:'9,395.00', M3:'9,408.00', M15:'9,475.00', M27:'9,525.00', change:'+112.00', changePerc:'+1.21', bid:'9,406.00', ask:'9,410.00', volume:'10,200' },
    { symbol:'AL', metal:'Alluminio', color:'#51AF40', C:'2,363.50', M3:'2,385.00', M15:'2,423.00', M27:'2,456.00', change:'-10.50', changePerc:'-0.44', bid:'2,383.50', ask:'2,386.50', volume:'24,100' },
    { symbol:'ZN', metal:'Zinco', color:'#3498DB', C:'2,828.00', M3:'2,843.00', M15:'2,878.00', M27:'2,908.00', change:'+16.50', changePerc:'+0.58', bid:'2,841.50', ask:'2,844.50', volume:'7,800' },
    { symbol:'NI', metal:'Nichel', color:'#9B59B6', C:'16,190.00', M3:'16,240.00', M15:'16,410.00', M27:'16,570.00', change:'-194.00', changePerc:'-1.18', bid:'16,230.00', ask:'16,250.00', volume:'4,900' },
    { symbol:'PB', metal:'Piombo', color:'#7F8C8D', C:'2,093.00', M3:'2,100.00', M15:'2,116.00', M27:'2,128.00', change:'+4.50', changePerc:'+0.21', bid:'2,098.00', ask:'2,102.00', volume:'2,800' },
    { symbol:'SN', metal:'Stagno', color:'#1ABC9C', C:'28,890.00', M3:'28,940.00', M15:'29,090.00', M27:'29,240.00', change:'-74.00', changePerc:'-0.26', bid:'28,930.00', ask:'28,950.00', volume:'1,560' },
  ],
  RU: [
    { symbol:'CU', metal:'Rame', color:'#E67E22', C:'9,400.00', M3:'9,415.00', M15:'9,482.00', M27:'9,532.00', change:'+117.50', changePerc:'+1.26', bid:'9,413.00', ask:'9,417.00', volume:'8,900' },
    { symbol:'AL', metal:'Alluminio', color:'#51AF40', C:'2,366.50', M3:'2,388.50', M15:'2,426.00', M27:'2,459.00', change:'-7.50', changePerc:'-0.31', bid:'2,387.00', ask:'2,390.00', volume:'18,700' },
    { symbol:'ZN', metal:'Zinco', color:'#3498DB', C:'2,832.00', M3:'2,847.50', M15:'2,882.00', M27:'2,912.00', change:'+20.75', changePerc:'+0.74', bid:'2,846.00', ask:'2,849.00', volume:'6,400' },
    { symbol:'NI', metal:'Nichel', color:'#9B59B6', C:'16,210.00', M3:'16,260.00', M15:'16,430.00', M27:'16,590.00', change:'-174.00', changePerc:'-1.06', bid:'16,250.00', ask:'16,270.00', volume:'3,800' },
    { symbol:'PB', metal:'Piombo', color:'#7F8C8D', C:'2,096.00', M3:'2,103.00', M15:'2,119.00', M27:'2,131.00', change:'+7.50', changePerc:'+0.36', bid:'2,101.00', ask:'2,105.00', volume:'2,100' },
    { symbol:'SN', metal:'Stagno', color:'#1ABC9C', C:'28,905.00', M3:'28,955.00', M15:'29,105.00', M27:'29,255.00', change:'-59.00', changePerc:'-0.20', bid:'28,945.00', ask:'28,965.00', volume:'1,200' },
  ]
};

const preziosiSpot = [
  { symbol:'XAU', metal:'Oro', price:'2,438.60', change:'+20.40', changePerc:'+0.85' },
  { symbol:'XAG', metal:'Argento', price:'31.24', change:'+0.47', changePerc:'+1.52' },
  { symbol:'XPT', metal:'Platino', price:'1,024.50', change:'+4.50', changePerc:'+0.44' },
  { symbol:'XPD', metal:'Palladio', price:'968.30', change:'-16.40', changePerc:'-1.67' },
];

const preziosiFixing = [
  { symbol:'XAU', metal:'Oro', price:'2,435.25', session:'AM', timestamp:'10:30 LDN' },
  { symbol:'XAU', metal:'Oro', price:'2,437.80', session:'PM', timestamp:'15:00 LDN' },
  { symbol:'XAG', metal:'Argento', price:'31.10', session:'12:00', timestamp:'12:00 LDN' },
  { symbol:'XPT', metal:'Platino', price:'1,022.00', session:'AM', timestamp:'09:45 LDN' },
  { symbol:'XPD', metal:'Palladio', price:'970.50', session:'AM', timestamp:'09:45 LDN' },
];

const forexData = {
  BCE: [
    { symbol:'EUR/USD', rate:'1.0847', change:'+0.0013', changePerc:'+0.12', bid:'1.0845', ask:'1.0849' },
    { symbol:'EUR/GBP', rate:'0.8614', change:'-0.0007', changePerc:'-0.08', bid:'0.8612', ask:'0.8616' },
    { symbol:'EUR/JPY', rate:'163.42', change:'+0.39', changePerc:'+0.24', bid:'163.40', ask:'163.44' },
    { symbol:'EUR/CHF', rate:'0.9512', change:'+0.0008', changePerc:'+0.08', bid:'0.9510', ask:'0.9514' },
  ],
  BFIX: [
    { symbol:'EUR/USD', rate:'1.0845', change:'+0.0011', changePerc:'+0.10', bid:'1.0843', ask:'1.0847' },
    { symbol:'EUR/GBP', rate:'0.8612', change:'-0.0009', changePerc:'-0.10', bid:'0.8610', ask:'0.8614' },
  ],
  LME: [
    { symbol:'EUR/USD', rate:'1.0843', change:'+0.0009', changePerc:'+0.08', bid:'1.0841', ask:'1.0845' },
    { symbol:'GBP/USD', rate:'1.2592', change:'+0.0018', changePerc:'+0.14', bid:'1.2590', ask:'1.2594' },
  ]
};

const energiaData = [
  { symbol:'BRENT', name:'Brent Crude', price:'82.45', change:'-0.45', changePerc:'-0.54' },
  { symbol:'WTI', name:'WTI Crude', price:'78.12', change:'-0.48', changePerc:'-0.61' },
  { symbol:'PUN', name:'PUN Italia', price:'87.30', change:'-1.06', changePerc:'-1.20' },
  { symbol:'GAS-TTF', name:'Gas TTF', price:'28.45', change:'+0.62', changePerc:'+2.23' },
];

const rottamiData = {
  FER: [
    { symbol:'E3', description:'Proler (E3)', price:'310', priceRange:'300-320', unit:'EUR/t', change:'+1.30', changePerc:'+1.30' },
    { symbol:'E1', description:'Rottame Pesante (E1)', price:'280', priceRange:'270-290', unit:'EUR/t', change:'+0.70', changePerc:'+0.70' },
    { symbol:'SHRED', description:'Shredded', price:'325', priceRange:'315-335', unit:'EUR/t', change:'+1.60', changePerc:'+1.60' },
  ],
  NFER: [
    { symbol:'CU-ROT', description:'Rottame Rame', price:'8,450', priceRange:'8,350-8,550', unit:'EUR/t', change:'+0.85', changePerc:'+0.85' },
    { symbol:'AL-ROT', description:'Rottame Alluminio', price:'1,680', priceRange:'1,620-1,740', unit:'EUR/t', change:'-0.50', changePerc:'-0.50' },
  ]
};

const alertsAttivi = [
  { alertId:'ALT-001', mercato:'LME', simbolo:'CU 3M', condizione:'>', valore:9500, stato:'active' },
  { alertId:'ALT-002', mercato:'LME', simbolo:'AL 3M', condizione:'<', valore:2300, stato:'triggered' },
  { alertId:'ALT-003', mercato:'Preziosi', simbolo:'XAU SPOT', condizione:'>', valore:2450, stato:'active' },
  { alertId:'ALT-004', mercato:'Preziosi', simbolo:'XAU', condizione:'>', valore:'2,450.00', stato:'Attivo' },
  { alertId:'ALT-005', mercato:'Energia', simbolo:'BRENT', condizione:'<', valore:'80.00', stato:'In pausa' },
];

const newsData = [
  { newsId:'N-2026-0409-001', cat:'LME', title:'LME: scorte rame ai minimi da 6 mesi', summary:'Le scorte di rame nei magazzini LME sono scese a 112.450 tonnellate.', source:'Reuters', publishDate:'14:22' },
  { newsId:'N-2026-0409-002', cat:'Preziosi', title:'Preziosi in rialzo dopo dati CPI USA', summary:'L\'oro spot ha toccato i 2.438 USD/oz dopo dati inflazione al 2.4%.', source:'Bloomberg', publishDate:'12:45' },
  { newsId:'N-2026-0409-003', cat:'LME', title:'Alluminio: Rusal riduce produzione Q2', summary:'Il colosso russo riduce produzione del 5% per costi energetici elevati.', source:'Metal Bulletin', publishDate:'11:30' },
  { newsId:'N-2026-0409-004', cat:'Energia', title:'Petrolio: OPEC+ conferma tagli produttivi', summary:'L\'organizzazione OPEC+ mantiene le restrizioni sulla produzione fino a giugno 2026.', source:'CNBC', publishDate:'10:15' },
  { newsId:'N-2026-0409-005', cat:'Preziosi', title:'Argento: nuovi massimi in 3 anni', summary:'L\'argento spot ha superato i 31 USD/oz per la prima volta dal 2023.', source:'Investing.com', publishDate:'09:45' },
  { newsId:'N-2026-0409-006', cat:'Forex', title:'EUR/USD: la Fed mantiene i tassi stabili', summary:'Nuovo meeting della Federal Reserve conferma il pause nei rialzi del tasso di riferimento.', source:'Reuters', publishDate:'08:30' },
  { newsId:'N-2026-0409-007', cat:'LME', title:'Zinco: domanda da settore costruzioni in calo', summary:'I dati sui permessi edili USA mostrano un rallentamento congiunturale dello 0.8%.', source:'Trading Economics', publishDate:'07:20' },
  { newsId:'N-2026-0409-008', cat:'Report', title:'Analisi settimanale metalli industriali', summary:'Il rapporto tecnico settimanale da FTMercati: le tendenze per la prossima settimana.', source:'FTMercati', publishDate:'17:00' },
  { newsId:'N-2026-0409-009', cat:'Energia', title:'Gas naturale: preoccupazioni sulla fornitura estiva', summary:'Le riserve di gas TTF rimangono sotto la media stagionale a causa del caldo anomalo.', source:'S&P Global', publishDate:'16:45' },
  { newsId:'N-2026-0409-010', cat:'LME', title:'Nichel: possibile rally da eccesso corto', summary:'Gli analisti tecnici identificano una potenziale spinta rialzista su livelli critici.', source:'Refinitiv', publishDate:'15:30' },
];

// ═══════ RENDER FUNCTIONS ═══════
function renderLMETable() {
  const data = lmeData[currentLMESource];
  document.getElementById('lmeTableBody').innerHTML = data.map(d => {
    const up = !d.changePerc.startsWith('-');
    return `<tr>
      <td><span style="font-weight:600;"><span class="metal-dot" style="background:${d.color};"></span>${d.metal} (${d.symbol})</span></td>
      <td class="right price">${d.C}</td>
      <td class="right price" style="font-weight:700;">${d.M3}</td>
      <td class="right price">${d.M15}</td>
      <td class="right price">${d.M27}</td>
      <td class="right change ${up?'up':'down'}">${up?'▲':'▼'} ${d.changePerc}%</td>
      <td class="right" style="font-family:var(--mono);font-size:12px;">${d.bid}</td>
      <td class="right" style="font-family:var(--mono);font-size:12px;">${d.ask}</td>
      <td class="right" style="font-family:var(--mono);font-size:12px;">${d.volume}</td>
    </tr>`;
  }).join('');
}

function renderPreziosiTable() {
  if (currentPreziosiMode === 'spot') {
    document.getElementById('preziosiTHead').innerHTML = '<tr><th>Metallo</th><th class="right">Prezzo</th><th class="right">Var</th><th class="right">Var %</th></tr>';
    document.getElementById('preziosiTableBody').innerHTML = preziosiSpot.map(d => {
      const up = !d.changePerc.startsWith('-');
      return `<tr>
        <td><span style="font-weight:600;"><span class="metal-dot" style="background:#FFD700;"></span>${d.metal}</span></td>
        <td class="right price" style="font-weight:700;">${d.price}</td>
        <td class="right change ${up?'up':'down'}">${up?'+':''}${d.change}</td>
        <td class="right change ${up?'up':'down'}">${up?'▲':'▼'} ${d.changePerc}%</td>
      </tr>`;
    }).join('');
  } else {
    document.getElementById('preziosiTHead').innerHTML = '<tr><th>Metallo</th><th class="right">Fixing</th><th class="right">Session</th><th class="right">Ora</th></tr>';
    document.getElementById('preziosiTableBody').innerHTML = preziosiFixing.map(d => `
      <tr><td><span style="font-weight:600;">${d.metal}</span></td>
      <td class="right price" style="font-weight:700;">${d.price}</td>
      <td class="right" style="font-size:12px;">${d.session}</td>
      <td class="right" style="font-size:12px;">${d.timestamp}</td></tr>
    `).join('');
  }
}

function renderForexTable() {
  const data = forexData[currentForexSource];
  document.getElementById('forexTableBody').innerHTML = data.map(d => {
    const up = !d.changePerc.startsWith('-');
    return `<tr>
      <td style="font-weight:600;">${d.symbol}</td>
      <td class="right price" style="font-weight:700;">${d.rate}</td>
      <td class="right change ${up?'up':'down'}">${up?'+':''}${d.change}</td>
      <td class="right change ${up?'up':'down'}">${up?'▲':'▼'} ${d.changePerc}%</td>
      <td class="right" style="font-family:var(--mono);font-size:12px;">${d.bid}</td>
      <td class="right" style="font-family:var(--mono);font-size:12px;">${d.ask}</td>
    </tr>`;
  }).join('');
}

function renderEnergiaTable() {
  document.getElementById('energiaTableBody').innerHTML = energiaData.map(d => {
    const up = !d.changePerc.startsWith('-');
    return `<tr>
      <td style="font-weight:600;">${d.name}</td>
      <td class="right price" style="font-weight:700;">${d.price}</td>
      <td class="right change ${up?'up':'down'}">${up?'+':''}${d.change}</td>
      <td class="right change ${up?'up':'down'}">${up?'▲':'▼'} ${d.changePerc}%</td>
    </tr>`;
  }).join('');
}

function renderRottamiTable() {
  const data = rottamiData[currentRottamiGroup];
  document.getElementById('rottamiTableBody').innerHTML = data.map(d => {
    const up = !d.changePerc.startsWith('-');
    return `<tr>
      <td style="font-weight:600;">${d.description}</td>
      <td class="right price" style="font-weight:700;">${d.price}</td>
      <td class="right" style="font-family:var(--mono);font-size:12px;">${d.priceRange}</td>
      <td class="right" style="font-size:12px;">${d.unit}</td>
      <td class="right change ${up?'up':'down'}">${up?'▲':'▼'} ${d.changePerc}%</td>
    </tr>`;
  }).join('');
}

function renderAlerts() {
  document.getElementById('alertsList').innerHTML = alertsAttivi.map(a => {
    const dotClass = a.stato === 'active' ? 'active' : 'triggered';
    const condLabel = a.condizione === '>' ? '>' : '<';
    return `<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;display:flex;align-items:center;gap:12px;">
      <span style="width:8px;height:8px;border-radius:50%;background:${a.stato==='active'?'var(--positive)':'var(--warning)'}"></span>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:14px;">${a.simbolo}</div>
        <div style="font-size:12px;color:var(--text-tertiary);">Target ${condLabel} ${a.valore.toLocaleString()}</div>
      </div>
      <span style="font-size:12px;color:var(--text-tertiary);">${a.mercato}</span>
    </div>`;
  }).join('');
}

function renderPreferiti() {
  const preferiti = ['LME Metalli', 'Preziosi', 'Forex EUR/USD', 'Petrolio Brent'];
  document.getElementById('preferitiList').innerHTML = preferiti.map(p => `
    <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-md);padding:20px;text-align:center;cursor:pointer;transition:all var(--transition);" onmouseover="this.style.boxShadow='var(--shadow-md)';" onmouseout="this.style.boxShadow='none';">
      <div style="font-size:24px;margin-bottom:8px;">⭐</div>
      <div style="font-weight:600;font-size:14px;">${p}</div>
    </div>
  `).join('');
}

function renderNews(filter) {
  const data = filter === 'all' ? newsData : newsData.filter(n => n.cat === filter);
  document.getElementById('newsList').innerHTML = data.map(n => `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:20px;cursor:pointer;transition:all var(--transition);" onmouseover="this.style.boxShadow='var(--shadow-md)';" onmouseout="this.style.boxShadow='none';">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:11px;font-weight:600;padding:2px 8px;background:var(--accent-light);color:var(--accent);border-radius:var(--radius-full);">${n.cat}</span>
        <span style="font-size:11px;color:var(--text-tertiary);">${n.publishDate}</span>
      </div>
      <h3 style="font-size:15px;font-weight:700;margin-bottom:6px;line-height:1.4;">${n.title}</h3>
      <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;">${n.summary}</p>
    </div>
  `).join('');
}

function filterNewsPublic(cat, btn) {
  btn.parentElement.querySelectorAll('.chart-period').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderNews(cat);
}

function filterNewsAR(cat, btn) {
  btn.parentElement.querySelectorAll('.chart-period').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const data = cat === 'all' ? newsData : newsData.filter(n => n.cat === cat);
  document.getElementById('arNewsList').innerHTML = data.map(n => `
    <div class="news-card" data-news-id="${n.newsId}">
      <div class="news-card-meta">
        <span class="news-card-cat">${n.cat}</span>
        <span class="news-card-time">${n.publishDate}</span>
        <span style="font-size:11px;color:var(--text-tertiary);margin-left:auto;">${n.source}</span>
      </div>
      <div class="news-card-title">${n.title}</div>
      <div class="news-card-desc">${n.summary}</div>
    </div>
  `).join('');
}

function switchLMESource(src, btn) {
  currentLMESource = src;
  btn.parentElement.querySelectorAll('.chart-source').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderLMETable();
  drawMarketChart('lmeChart', 9400, 80, '#E67E22', 'Rame Cash (USD/t)');
}

function switchPreziosiMode(mode, btn) {
  currentPreziosiMode = mode;
  btn.parentElement.querySelectorAll('.chart-source').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderPreziosiTable();
  drawMarketChart('preziosiChart', 2438, 15, '#F1C40F', 'Oro Spot (USD/oz)');
}

function switchForexSource(src, btn) {
  currentForexSource = src;
  btn.parentElement.querySelectorAll('.chart-source').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderForexTable();
  drawMarketChart('forexChart', 1.0847, 0.003, '#009FE3', 'EUR/USD');
}

function switchRottamiGroup(grp, btn) {
  currentRottamiGroup = grp;
  btn.parentElement.querySelectorAll('.chart-source').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderRottamiTable();
  drawMarketChart('rottamiChart', 320, 8, '#7F8C8D', 'Rottame E3 (EUR/t)');
}

function switchChartPeriod(btn) {
  btn.parentElement.querySelectorAll('.chart-period').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // Find the chart container in the same ar-page
  const page = btn.closest('.ar-page');
  if (!page) return;
  const chart = page.querySelector('.chart-container');
  if (!chart) return;
  // Redraw with same params but different point count to simulate period change
  const id = chart.id;
  const stored = chartDataStore[id];
  if (stored) drawMarketChart(id, stored.basePrice, stored.color === stored.color ? stored.basePrice * 0.008 : 0, stored.color, stored.label);
  else setTimeout(drawAllCharts, 50);
}

renderNews('all');

// ═══════ CHART DRAWING ═══════
// ═══════ INTERACTIVE CHART SYSTEM ═══════
// Stores chart data per container for interactivity
const chartDataStore = {};

function drawMarketChart(containerId, basePrice, volatility, color, label) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const w = container.offsetWidth || 600;
  const h = container.offsetHeight || 200;
  const pad = { top: 40, right: 60, bottom: 30, left: 10 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;
  const n = 80;
  const points = [];
  let price = basePrice;
  for (let i = 0; i < n; i++) {
    price += (Math.random() - 0.46) * volatility;
    price = Math.max(basePrice * 0.94, Math.min(basePrice * 1.06, price));
    points.push(price);
  }
  // Store for interactivity
  chartDataStore[containerId] = { points, basePrice, w, h, pad, cw, ch, n, color, label };

  const minP = Math.min(...points) - volatility * 0.5;
  const maxP = Math.max(...points) + volatility * 0.5;
  const sx = i => pad.left + (i / (n - 1)) * cw;
  const sy = p => pad.top + ch - ((p - minP) / (maxP - minP)) * ch;
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(p).toFixed(1)}`).join(' ');

  const gridLines = [], gridLabels = [];
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (i / 4) * ch;
    const val = maxP - (i / 4) * (maxP - minP);
    gridLines.push(`<line x1="${pad.left}" y1="${y}" x2="${w - pad.right}" y2="${y}" stroke="var(--chart-grid)" stroke-width="0.5" stroke-dasharray="4 3"/>`);
    gridLabels.push(`<text x="${w - pad.right + 6}" y="${y + 4}" fill="var(--text-tertiary)" font-size="10" font-family="var(--mono)">${val.toFixed(val > 100 ? 0 : val > 10 ? 2 : 4)}</text>`);
  }
  const timeLabels = [];
  const times = ['09:00','10:30','12:00','13:30','15:00','16:30'];
  times.forEach((t, i) => {
    const x = pad.left + (i / (times.length - 1)) * cw;
    timeLabels.push(`<text x="${x}" y="${h - 6}" fill="var(--text-tertiary)" font-size="10" text-anchor="middle" font-family="var(--mono)">${t}</text>`);
  });

  const lastPrice = points[n - 1];
  const firstPrice = points[0];
  const isUp = lastPrice >= firstPrice;
  const lineColor = color || (isUp ? 'var(--positive)' : 'var(--negative)');
  const changeVal = lastPrice - firstPrice;
  const changePct = ((changeVal / firstPrice) * 100).toFixed(2);
  const arrow = isUp ? '▲' : '▼';
  const fmt = v => v > 100 ? v.toFixed(2) : v > 10 ? v.toFixed(2) : v.toFixed(4);

  container.innerHTML = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:100%;cursor:crosshair;" id="svg_${containerId}">
    <defs>
      <linearGradient id="cg_${containerId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${lineColor}" stop-opacity=".12"/>
        <stop offset="100%" stop-color="${lineColor}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${gridLines.join('')}${gridLabels.join('')}${timeLabels.join('')}
    <path d="${pathD} L${sx(n - 1)},${h - pad.bottom} L${pad.left},${h - pad.bottom} Z" fill="url(#cg_${containerId})"/>
    <path d="${pathD}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${sx(n - 1)}" cy="${sy(lastPrice)}" r="4" fill="${lineColor}"/>
    <circle cx="${sx(n - 1)}" cy="${sy(lastPrice)}" r="8" fill="${lineColor}" opacity=".15"/>
    <!-- Interactive overlay elements (hidden by default) -->
    <line id="crosshair_${containerId}" x1="0" y1="${pad.top}" x2="0" y2="${h - pad.bottom}" stroke="var(--text-tertiary)" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>
    <circle id="dot_${containerId}" cx="0" cy="0" r="5" fill="${lineColor}" stroke="var(--bg-card)" stroke-width="2" opacity="0"/>
    <rect id="tooltip_bg_${containerId}" x="0" y="2" rx="6" ry="6" width="0" height="28" fill="var(--bg-card)" stroke="var(--border)" stroke-width="1" opacity="0"/>
    <text id="tooltip_${containerId}" x="0" y="20" fill="var(--text-primary)" font-size="12" font-weight="700" font-family="var(--mono)" opacity="0"></text>
    <!-- Header info -->
    <text x="${pad.left + 4}" y="16" fill="var(--text-secondary)" font-size="11" font-weight="600" font-family="var(--font)">${label || ''}</text>
    <text id="hdr_price_${containerId}" x="${pad.left + 4}" y="32" fill="var(--text-primary)" font-size="16" font-weight="800" font-family="var(--mono)">${fmt(lastPrice)}</text>
    <text id="hdr_change_${containerId}" x="${pad.left + 4 + (fmt(lastPrice).length * 10) + 8}" y="32" fill="${isUp ? 'var(--positive)' : 'var(--negative)'}" font-size="12" font-weight="700" font-family="var(--mono)">${arrow} ${changePct > 0 ? '+' : ''}${changePct}%</text>
  </svg>`;

  // Attach interactive event listeners
  attachChartInteractivity(containerId, points, minP, maxP, sx, sy, lineColor, fmt);
}

function attachChartInteractivity(containerId, points, minP, maxP, sx, sy, lineColor, fmt) {
  const svgEl = document.getElementById('svg_' + containerId);
  if (!svgEl) return;
  const n = points.length;
  const data = chartDataStore[containerId];
  const firstPrice = points[0];

  function getIndex(clientX) {
    const rect = svgEl.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * data.w;
    const ratio = (svgX - data.pad.left) / data.cw;
    return Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1))));
  }

  function showCrosshair(idx) {
    const crosshair = document.getElementById('crosshair_' + containerId);
    const dot = document.getElementById('dot_' + containerId);
    const tooltip = document.getElementById('tooltip_' + containerId);
    const tooltipBg = document.getElementById('tooltip_bg_' + containerId);
    const hdrPrice = document.getElementById('hdr_price_' + containerId);
    const hdrChange = document.getElementById('hdr_change_' + containerId);
    if (!crosshair) return;

    const price = points[idx];
    const x = sx(idx);
    const y = sy(price);
    const changeVal = price - firstPrice;
    const changePct = ((changeVal / firstPrice) * 100).toFixed(2);
    const isUp = price >= firstPrice;
    const arrow = isUp ? '▲' : '▼';
    const priceStr = fmt(price);
    const timeMinutes = Math.round((idx / (n - 1)) * 450 + 540);
    const timeStr = String(Math.floor(timeMinutes / 60)).padStart(2, '0') + ':' + String(timeMinutes % 60).padStart(2, '0');

    crosshair.setAttribute('x1', x);
    crosshair.setAttribute('x2', x);
    crosshair.setAttribute('opacity', '0.6');
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);
    dot.setAttribute('opacity', '1');
    dot.setAttribute('fill', lineColor);

    // Tooltip
    const tooltipText = priceStr + '  ' + timeStr;
    const tw = tooltipText.length * 7.5 + 16;
    let tx = x - tw / 2;
    if (tx < data.pad.left) tx = data.pad.left;
    if (tx + tw > data.w - data.pad.right) tx = data.w - data.pad.right - tw;
    tooltipBg.setAttribute('x', tx);
    tooltipBg.setAttribute('width', tw);
    tooltipBg.setAttribute('opacity', '1');
    tooltip.setAttribute('x', tx + 8);
    tooltip.textContent = tooltipText;
    tooltip.setAttribute('opacity', '1');

    // Update header
    if (hdrPrice) hdrPrice.textContent = priceStr;
    if (hdrChange) {
      hdrChange.textContent = arrow + ' ' + (changePct > 0 ? '+' : '') + changePct + '%';
      hdrChange.setAttribute('fill', isUp ? 'var(--positive)' : 'var(--negative)');
    }
  }

  function hideCrosshair() {
    ['crosshair_','dot_','tooltip_','tooltip_bg_'].forEach(prefix => {
      const el = document.getElementById(prefix + containerId);
      if (el) el.setAttribute('opacity', '0');
    });
    // Reset header to last price
    const lastPrice = points[n - 1];
    const changeVal = lastPrice - firstPrice;
    const changePct = ((changeVal / firstPrice) * 100).toFixed(2);
    const isUp = lastPrice >= firstPrice;
    const hdrPrice = document.getElementById('hdr_price_' + containerId);
    const hdrChange = document.getElementById('hdr_change_' + containerId);
    if (hdrPrice) hdrPrice.textContent = fmt(lastPrice);
    if (hdrChange) {
      hdrChange.textContent = (isUp ? '▲' : '▼') + ' ' + (changePct > 0 ? '+' : '') + changePct + '%';
      hdrChange.setAttribute('fill', isUp ? 'var(--positive)' : 'var(--negative)');
    }
  }

  // Mouse events
  svgEl.addEventListener('mousemove', function(e) { showCrosshair(getIndex(e.clientX)); });
  svgEl.addEventListener('mouseleave', hideCrosshair);

  // Touch events
  svgEl.addEventListener('touchmove', function(e) {
    e.preventDefault();
    showCrosshair(getIndex(e.touches[0].clientX));
  }, { passive: false });
  svgEl.addEventListener('touchend', hideCrosshair);
}

function drawAllCharts() {
  drawMarketChart('lmeChart', 9400, 80, '#E67E22', 'Rame Cash (USD/t)');
  drawMarketChart('preziosiChart', 2438, 15, '#F1C40F', 'Oro Spot (USD/oz)');
  drawMarketChart('forexChart', 1.0847, 0.003, '#009FE3', 'EUR/USD');
  drawMarketChart('energiaChart', 82.45, 1.2, '#2C3E50', 'Brent (USD/bbl)');
  drawMarketChart('rottamiChart', 320, 8, '#7F8C8D', 'Rottame E3 (EUR/t)');
}

window.addEventListener('resize', () => { if (isLoggedIn) drawAllCharts(); });

// Draw charts when entering reserved area pages
const origGoARPage = goARPage;
goARPage = function(page) {
  origGoARPage(page);
  setTimeout(drawAllCharts, 50);
};

// Initial state: public site visible, area riservata hidden
document.getElementById('arHeader').classList.add('hidden');
document.getElementById('arContainer').classList.add('hidden');

// ═══════ SEARCH ═══════
const searchIndex = [
  { name: 'LME Metalli', cat: 'Mercati', page: 'lme', area: 'ar' },
  { name: 'Rame (Copper)', cat: 'LME', page: 'lme', area: 'ar' },
  { name: 'Alluminio (Aluminium)', cat: 'LME', page: 'lme', area: 'ar' },
  { name: 'Zinco (Zinc)', cat: 'LME', page: 'lme', area: 'ar' },
  { name: 'Nichel (Nickel)', cat: 'LME', page: 'lme', area: 'ar' },
  { name: 'Piombo (Lead)', cat: 'LME', page: 'lme', area: 'ar' },
  { name: 'Stagno (Tin)', cat: 'LME', page: 'lme', area: 'ar' },
  { name: 'Preziosi — Oro e Argento', cat: 'Mercati', page: 'preziosi', area: 'ar' },
  { name: 'Oro (Gold) Spot', cat: 'Preziosi', page: 'preziosi', area: 'ar' },
  { name: 'Argento (Silver) Spot', cat: 'Preziosi', page: 'preziosi', area: 'ar' },
  { name: 'Platino (Platinum)', cat: 'Preziosi', page: 'preziosi', area: 'ar' },
  { name: 'Palladio (Palladium)', cat: 'Preziosi', page: 'preziosi', area: 'ar' },
  { name: 'Forex — Cambi Valuta', cat: 'Mercati', page: 'forex', area: 'ar' },
  { name: 'EUR/USD', cat: 'Forex', page: 'forex', area: 'ar' },
  { name: 'EUR/GBP', cat: 'Forex', page: 'forex', area: 'ar' },
  { name: 'EUR/JPY', cat: 'Forex', page: 'forex', area: 'ar' },
  { name: 'EUR/CHF', cat: 'Forex', page: 'forex', area: 'ar' },
  { name: 'Energia — Petrolio e Gas', cat: 'Mercati', page: 'energia', area: 'ar' },
  { name: 'Brent Crude Oil', cat: 'Energia', page: 'energia', area: 'ar' },
  { name: 'WTI Crude Oil', cat: 'Energia', page: 'energia', area: 'ar' },
  { name: 'Gas Naturale (TTF)', cat: 'Energia', page: 'energia', area: 'ar' },
  { name: 'Rottami — Ferrosi e Non Ferrosi', cat: 'Mercati', page: 'rottami', area: 'ar' },
  { name: 'Rottame E1', cat: 'Rottami', page: 'rottami', area: 'ar' },
  { name: 'Rottame E3', cat: 'Rottami', page: 'rottami', area: 'ar' },
  { name: 'Alert e Notifiche', cat: 'Strumenti', page: 'alerts', area: 'ar' },
  { name: 'Preferiti', cat: 'Strumenti', page: 'preferiti', area: 'ar' },
  { name: 'News e Report', cat: 'Info', page: 'news', area: 'ar' },
  { name: 'Prezzi Rame', cat: 'Pubblico', page: 'home', area: 'pub' },

  { name: 'Contatti', cat: 'Pubblico', page: 'contatti', area: 'pub' },
];

let searchSelectedIdx = -1;

function openSearch() {
  const overlay = document.getElementById('searchOverlay');
  overlay.classList.add('active');
  const input = document.getElementById('searchInput');
  input.value = '';
  input.focus();
  document.getElementById('searchResults').innerHTML = '';
  searchSelectedIdx = -1;
}

function closeSearch() {
  document.getElementById('searchOverlay').classList.remove('active');
}

function handleSearch(query) {
  const results = document.getElementById('searchResults');
  searchSelectedIdx = -1;
  if (!query || query.length < 1) { results.innerHTML = ''; return; }
  const q = query.toLowerCase();
  const matches = searchIndex.filter(item =>
    item.name.toLowerCase().includes(q) || item.cat.toLowerCase().includes(q)
  ).slice(0, 8);
  if (matches.length === 0) {
    results.innerHTML = '<div style="padding:16px 20px;color:var(--text-tertiary);font-size:13px;">Nessun risultato per "' + query + '"</div>';
    return;
  }
  results.innerHTML = matches.map((m, i) =>
    '<div class="search-result-item" data-idx="' + i + '" onclick="selectSearchResult(' + i + ')" onmouseenter="searchSelectedIdx=' + i + ';highlightSearchResult()">' +
    '<span class="search-result-cat">' + m.cat + '</span>' +
    '<span style="font-size:14px;font-weight:500;color:var(--text-primary);">' + m.name + '</span>' +
    '</div>'
  ).join('');
  window._searchMatches = matches;
}

function selectSearchResult(idx) {
  const matches = window._searchMatches;
  if (!matches || !matches[idx]) return;
  const m = matches[idx];
  closeSearch();
  if (m.area === 'ar' && isLoggedIn) {
    goARPage(m.page);
  } else {
    goPublicPage(m.page);
  }
}

function highlightSearchResult() {
  document.querySelectorAll('.search-result-item').forEach((el, i) => {
    el.classList.toggle('selected', i === searchSelectedIdx);
  });
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  // Ctrl+K or Cmd+K to open search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    openSearch();
  }
  // Esc to close search
  if (e.key === 'Escape') {
    closeSearch();
  }
  // Arrow keys in search
  if (document.getElementById('searchOverlay').classList.contains('active')) {
    const items = document.querySelectorAll('.search-result-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      searchSelectedIdx = Math.min(searchSelectedIdx + 1, items.length - 1);
      highlightSearchResult();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      searchSelectedIdx = Math.max(searchSelectedIdx - 1, 0);
      highlightSearchResult();
    } else if (e.key === 'Enter' && searchSelectedIdx >= 0) {
      e.preventDefault();
      selectSearchResult(searchSelectedIdx);
    }
  }
});

// ═══════ DASHBOARD SPARKLINES ═══════
function drawSparkline(containerId, basePrice, volatility, color) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const w = 160, h = 32;
  const points = [];
  let price = basePrice;
  for (let i = 0; i < 20; i++) {
    price += (Math.random() - 0.48) * volatility;
    points.push(price);
  }
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return x + ',' + y;
  });
  const pathD = 'M' + coords.join(' L');
  const fillD = pathD + ' L' + w + ',' + h + ' L0,' + h + ' Z';
  el.innerHTML = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" style="display:block;">' +
    '<defs><linearGradient id="sg_' + containerId + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + color + '" stop-opacity="0.3"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
    '<path d="' + fillD + '" fill="url(#sg_' + containerId + ')"/>' +
    '<path d="' + pathD + '" fill="none" stroke="' + color + '" stroke-width="1.5"/>' +
    '</svg>';
}