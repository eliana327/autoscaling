// ==============================================================================
// AWS AUTO SCALING & LOAD BALANCING DASHBOARD CLIENT
// ==============================================================================

const state = {
  currentInstance: null,
  stressActive: false,
  stressInterval: null,
  stressSeconds: 0,
  isTesting: false,
  isLooping: false,
  loopInterval: null,
  instancesDiscovered: {}, // { instanceId: { az, ip, count, color } }
  totalRequests: 0,
  colors: ['#00e5ff', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#f97316'],
  nextColorIndex: 0
};

// DOM Elements
const el = {
  instId: document.getElementById('instId'),
  instAz: document.getElementById('instAz'),
  instIp: document.getElementById('instIp'),
  instUptime: document.getElementById('instUptime'),
  cpuPercent: document.getElementById('cpuPercent'),
  cpuProgressBar: document.getElementById('cpuProgressBar'),
  cpuStatusLabel: document.getElementById('cpuStatusLabel'),
  memPercent: document.getElementById('memPercent'),
  memProgressBar: document.getElementById('memProgressBar'),
  memUsageLabel: document.getElementById('memUsageLabel'),
  lastUpdated: document.getElementById('lastUpdated'),
  btnRefreshInfo: document.getElementById('btnRefreshInfo'),

  // Stress
  stressCard: document.getElementById('stressCard'),
  stressBadge: document.getElementById('stressBadge'),
  stressStatusText: document.getElementById('stressStatusText'),
  stressTimer: document.getElementById('stressTimer'),
  stressDesc: document.getElementById('stressDesc'),
  btnStartStress: document.getElementById('btnStartStress'),
  btnStopStress: document.getElementById('btnStopStress'),

  // Balance
  btnRunBurst: document.getElementById('btnRunBurst'),
  btnToggleLoop: document.getElementById('btnToggleLoop'),
  loopBtnText: document.getElementById('loopBtnText'),
  testProgressArea: document.getElementById('testProgressArea'),
  testProgressBar: document.getElementById('testProgressBar'),
  testProgressLabel: document.getElementById('testProgressLabel'),
  instanceCount: document.getElementById('instanceCount'),
  totalReqCount: document.getElementById('totalReqCount'),
  instanceCardsGrid: document.getElementById('instanceCardsGrid'),
  distributionBars: document.getElementById('distributionBars'),
  logTableBody: document.getElementById('logTableBody'),
  btnClearLog: document.getElementById('btnClearLog')
};

// ------------------------------------------------------------------------------
// 1. OBTENCIÓN Y ACTUALIZACIÓN DE INFORMACIÓN DE INSTANCIA (/api/info)
// ------------------------------------------------------------------------------
async function fetchInstanceInfo() {
  try {
    const startTs = performance.now();
    // Cache buster to ensure request hits through ALB
    const resp = await fetch(`/api/info?t=${Date.now()}`, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const latency = Math.round(performance.now() - startTs);

    renderCurrentInstance(data);
    updateStressStateFromData(data);
    el.lastUpdated.innerText = new Date().toLocaleTimeString();

    return { data, latency };
  } catch (err) {
    console.error('Error fetching instance info:', err);
    el.lastUpdated.innerText = 'Error de conexión';
    return null;
  }
}

function renderCurrentInstance(info) {
  state.currentInstance = info;
  el.instId.innerText = info.instance_id || 'i-desconocida';
  el.instAz.innerText = `Zona: ${info.availability_zone || 'us-east-1'}`;
  el.instIp.innerText = info.private_ip || '---';
  el.instUptime.innerText = `Uptime: ${formatUptime(info.uptime_seconds)}`;

  // CPU
  const cpu = info.cpu_percent || 0;
  el.cpuPercent.innerText = `${cpu}%`;
  el.cpuProgressBar.style.width = `${Math.min(100, Math.max(0, cpu))}%`;
  
  el.cpuProgressBar.classList.remove('warning', 'danger');
  if (cpu >= 80) {
    el.cpuProgressBar.classList.add('danger');
    el.cpuStatusLabel.innerText = '🔥 CPU Crítica (Disparando Scale-Out)';
    el.cpuStatusLabel.style.color = 'var(--color-danger)';
  } else if (cpu >= 50) {
    el.cpuProgressBar.classList.add('warning');
    el.cpuStatusLabel.innerText = '⚠️ CPU Elevada (≥ 50% Umbral Alarma)';
    el.cpuStatusLabel.style.color = 'var(--color-warning)';
  } else {
    el.cpuStatusLabel.innerText = '✅ Carga Normal (< 50%)';
    el.cpuStatusLabel.style.color = 'var(--color-success)';
  }

  // Memory
  const memPct = info.memory_percent || 0;
  el.memPercent.innerText = `${memPct}%`;
  el.memProgressBar.style.width = `${memPct}%`;
  el.memUsageLabel.innerText = `${info.memory_used_mb || 0} MB / ${info.memory_total_mb || 1000} MB`;
}

function updateStressStateFromData(info) {
  if (info.stress_active && !state.stressActive) {
    setStressUI(true);
  } else if (!info.stress_active && state.stressActive) {
    setStressUI(false);
  }
}

function formatUptime(seconds) {
  if (!seconds) return '0s';
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m ${seconds % 60}s`;
}

// ------------------------------------------------------------------------------
// 2. CONTROL DE PRUEBA DE ESTRÉS (CPU 100%)
// ------------------------------------------------------------------------------
async function startStress() {
  try {
    el.btnStartStress.disabled = true;
    el.stressDesc.innerText = 'Iniciando carga de CPU en la máquina actual...';
    
    const resp = await fetch('/api/stress/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: 600 })
    });
    const result = await resp.json();
    console.log('Stress started:', result);

    setStressUI(true);
    // Inmediatamente consultar info para ver la subida
    setTimeout(fetchInstanceInfo, 1000);
  } catch (err) {
    console.error('Error starting stress:', err);
    alert('Error al iniciar estrés de CPU');
    el.btnStartStress.disabled = false;
  }
}

async function stopStress() {
  try {
    el.btnStopStress.disabled = true;
    el.stressDesc.innerText = 'Deteniendo procesos de estrés...';
    
    const resp = await fetch('/api/stress/stop', {
      method: 'POST'
    });
    const result = await resp.json();
    console.log('Stress stopped:', result);

    setStressUI(false);
    setTimeout(fetchInstanceInfo, 1000);
  } catch (err) {
    console.error('Error stopping stress:', err);
    alert('Error al detener estrés');
    el.btnStopStress.disabled = false;
  }
}

function setStressUI(active) {
  state.stressActive = active;
  if (active) {
    el.stressCard.classList.add('active');
    el.stressStatusText.innerText = '⚡ ESTRÉS ACTIVO - CPU 100%';
    el.stressDesc.innerHTML = '<strong>Procesos activos al 100%.</strong> En ~60s la alarma de CloudWatch <code>asg-high-cpu-alarm</code> escalará el ASG a nuevas instancias.';
    el.btnStartStress.disabled = true;
    el.btnStopStress.disabled = false;

    if (!state.stressInterval) {
      state.stressSeconds = 0;
      state.stressInterval = setInterval(() => {
        state.stressSeconds++;
        const m = String(Math.floor(state.stressSeconds / 60)).padStart(2, '0');
        const s = String(state.stressSeconds % 60).padStart(2, '0');
        el.stressTimer.innerText = `${m}:${s}`;
      }, 1000);
    }
  } else {
    el.stressCard.classList.remove('active');
    el.stressStatusText.innerText = 'ESTRÉS INACTIVO';
    el.stressDesc.innerText = 'Presiona el botón para generar carga matemática intensiva en los 2 vCPUs de esta máquina t3.micro.';
    el.btnStartStress.disabled = false;
    el.btnStopStress.disabled = true;

    if (state.stressInterval) {
      clearInterval(state.stressInterval);
      state.stressInterval = null;
      el.stressTimer.innerText = '00:00';
    }
  }
}

// ------------------------------------------------------------------------------
// 3. PRUEBA VISUAL DE BALANCEO DE CARGA (ALB)
// ------------------------------------------------------------------------------
async function runBurst() {
  if (state.isTesting) return;
  const burstSize = parseInt(document.querySelector('input[name="burstSize"]:checked').value, 10);
  
  state.isTesting = true;
  el.btnRunBurst.disabled = true;
  el.testProgressArea.style.display = 'flex';
  el.testProgressBar.style.width = '0%';
  el.testProgressLabel.innerText = `Enviando peticiones: 0/${burstSize}`;

  for (let i = 1; i <= burstSize; i++) {
    await sendSingleProbe(i, burstSize);
    el.testProgressBar.style.width = `${Math.round((i / burstSize) * 100)}%`;
    el.testProgressLabel.innerText = `Enviando peticiones: ${i}/${burstSize}`;
    // Pequeño retardo entre peticiones para permitir animación visual fluida
    await new Promise(r => setTimeout(r, 60));
  }

  state.isTesting = false;
  el.btnRunBurst.disabled = false;
  setTimeout(() => {
    if (!state.isLooping) el.testProgressArea.style.display = 'none';
  }, 1500);
}

function toggleLoop() {
  if (state.isLooping) {
    state.isLooping = false;
    clearInterval(state.loopInterval);
    state.loopInterval = null;
    el.btnToggleLoop.classList.remove('active');
    el.loopBtnText.innerText = 'Monitoreo Continuo';
  } else {
    state.isLooping = true;
    el.btnToggleLoop.classList.add('active');
    el.loopBtnText.innerText = 'Pausar Monitoreo';
    let reqIndex = state.totalRequests;
    state.loopInterval = setInterval(async () => {
      reqIndex++;
      await sendSingleProbe(reqIndex, '∞');
    }, 1000);
  }
}

async function sendSingleProbe(index, total) {
  try {
    const startTs = performance.now();
    // Cache buster
    const resp = await fetch(`/api/info?probe=${index}&_=${Date.now()}`, { cache: 'no-store' });
    const latency = Math.round(performance.now() - startTs);
    
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    recordInstanceHit(data);
    addLogRow(index, data, latency);
  } catch (err) {
    console.error('Probe failed:', err);
  }
}

function recordInstanceHit(info) {
  const id = info.instance_id || 'i-unknown';
  state.totalRequests++;

  if (!state.instancesDiscovered[id]) {
    const color = state.colors[state.nextColorIndex % state.colors.length];
    state.nextColorIndex++;
    state.instancesDiscovered[id] = {
      id: id,
      az: info.availability_zone || 'us-east-1',
      ip: info.private_ip || '---',
      count: 0,
      color: color,
      alias: `Instancia ${String.fromCharCode(65 + Object.keys(state.instancesDiscovered).length)}`
    };
  }

  state.instancesDiscovered[id].count++;
  state.instancesDiscovered[id].lastCpu = info.cpu_percent || 0;

  renderDiscoveredInstances(id);
}

function renderDiscoveredInstances(latestHitId) {
  const instances = Object.values(state.instancesDiscovered);
  el.instanceCount.innerText = instances.length;
  el.totalReqCount.innerText = state.totalRequests;

  // Render Cards Grid
  el.instanceCardsGrid.innerHTML = '';
  instances.forEach(inst => {
    const pct = Math.round((inst.count / state.totalRequests) * 100);
    const card = document.createElement('div');
    card.className = `discovered-instance-card ${inst.id === latestHitId ? 'highlight-hit' : ''}`;
    card.style.borderTop = `3px solid ${inst.color}`;

    card.innerHTML = `
      <div class="discovered-card-top">
        <span class="inst-name-badge" style="color: ${inst.color}; background: ${inst.color}15;">${inst.alias}</span>
        <span class="inst-az-badge mono">${inst.az}</span>
      </div>
      <div class="discovered-card-mid">
        <span class="discovered-id mono">${inst.id}</span>
        <span class="discovered-ip mono">${inst.ip}</span>
      </div>
      <div class="discovered-card-stats">
        <div>
          <span class="detail-label">Peticiones</span>
          <div class="req-count mono">${inst.count}</div>
        </div>
        <div class="share-percent mono">${pct}% carga</div>
      </div>
    `;
    el.instanceCardsGrid.appendChild(card);
  });

  // Render Comparative Distribution Bars
  el.distributionBars.innerHTML = '';
  instances.forEach(inst => {
    const pct = Math.round((inst.count / state.totalRequests) * 100);
    const item = document.createElement('div');
    item.className = 'dist-bar-item';
    item.innerHTML = `
      <div class="dist-bar-header">
        <span class="mono"><strong>${inst.alias}</strong> (${inst.id})</span>
        <span class="mono">${inst.count} reqs (${pct}%)</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${pct}%; background-color: ${inst.color};"></div>
      </div>
    `;
    el.distributionBars.appendChild(item);
  });
}

function addLogRow(idx, info, latency) {
  // Remove empty row if present
  const emptyRow = el.logTableBody.querySelector('.empty-row');
  if (emptyRow) emptyRow.remove();

  const tr = document.createElement('tr');
  const now = new Date().toLocaleTimeString();
  const inst = state.instancesDiscovered[info.instance_id];
  const color = inst ? inst.color : 'var(--color-accent)';

  tr.innerHTML = `
    <td>#${idx}</td>
    <td>${now}</td>
    <td style="color: ${color}; font-weight: 700;">${info.instance_id || 'unknown'}</td>
    <td>${info.availability_zone || 'us-east-1'}</td>
    <td>${info.private_ip || '---'}</td>
    <td>${info.cpu_percent || 0}%</td>
    <td style="color: ${latency < 100 ? 'var(--color-success)' : 'var(--color-warning)'}">${latency} ms</td>
  `;

  // Prepend to show newest on top
  el.logTableBody.insertBefore(tr, el.logTableBody.firstChild);

  // Keep max 50 rows
  while (el.logTableBody.children.length > 50) {
    el.logTableBody.removeChild(el.logTableBody.lastChild);
  }
}

function clearLog() {
  state.instancesDiscovered = {};
  state.totalRequests = 0;
  state.nextColorIndex = 0;
  el.instanceCount.innerText = '0';
  el.totalReqCount.innerText = '0';
  el.instanceCardsGrid.innerHTML = '<div class="empty-state">Lanza una prueba para descubrir las instancias del balanceador</div>';
  el.distributionBars.innerHTML = '';
  el.logTableBody.innerHTML = '<tr class="empty-row"><td colspan="7">No se han ejecutado peticiones aún</td></tr>';
}

// ------------------------------------------------------------------------------
// INICIALIZACIÓN Y EVENT LISTENERS
// ------------------------------------------------------------------------------
function init() {
  el.btnRefreshInfo.addEventListener('click', fetchInstanceInfo);
  el.btnStartStress.addEventListener('click', startStress);
  el.btnStopStress.addEventListener('click', stopStress);
  el.btnRunBurst.addEventListener('click', runBurst);
  el.btnToggleLoop.addEventListener('click', toggleLoop);
  el.btnClearLog.addEventListener('click', clearLog);

  // Primera consulta inmediata
  fetchInstanceInfo();

  // Polling automático cada 3 segundos de la instancia actual
  setInterval(fetchInstanceInfo, 3000);
}

document.addEventListener('DOMContentLoaded', init);
