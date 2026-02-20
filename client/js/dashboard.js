(function dashboardModule() {
  const state = {
    user: null,
    logs: [],
    filteredAsset: 'all',
    pagination: { page: 1, limit: 50 },
    charts: {
      portfolio: null,
      leakage: null,
      efficiency: null
    }
  };

  const pageMeta = {
    dashboard: { title: 'Dashboard', crumb: 'EcoPulse / Overview / Live Data' },
    report: { title: 'Analyst Report', crumb: 'EcoPulse / Analysis / Operational Audit' },
    alerts: { title: 'Live Alerts', crumb: 'EcoPulse / Monitoring / Alerts' },
    portfolio: { title: 'Portfolio', crumb: 'EcoPulse / Assets / All Plants' },
    settings: { title: 'Settings', crumb: 'EcoPulse / Account / Preferences' }
  };

  async function ensureChartJs() {
    if (typeof window.Chart !== 'undefined') return true;

    const sources = [
      `${window.location.origin}/vendor/chart.umd.min.js`,
      'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
      'https://unpkg.com/chart.js@4.4.0/dist/chart.umd.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'
    ];

    const loadScript = (src) =>
      new Promise((resolve) => {
        const existing = Array.from(document.querySelectorAll('script')).find((s) => s.src === src);
        if (existing) {
          existing.addEventListener('load', () => resolve(true), { once: true });
          existing.addEventListener('error', () => resolve(false), { once: true });
          return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });

    for (const src of sources) {
      const ok = await loadScript(src);
      if (ok && typeof window.Chart !== 'undefined') return true;
    }

    return false;
  }

  function demoLogs() {
    const today = new Date();
    const assets = ['solar', 'wind', 'hybrid', 'battery'];
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((offset) => {
      const dt = new Date(today);
      dt.setDate(today.getDate() - Math.floor(offset / 4));
      const expectedGeneration = 9000 + offset * 220;
      const actualGeneration = 7600 + offset * 180;
      const energyVariance = Math.max(0, expectedGeneration - actualGeneration);
      const tariff = 5.25;
      const revenueLoss = Number((energyVariance * tariff).toFixed(2));
      const variancePercent = Number(((energyVariance / expectedGeneration) * 100).toFixed(2));
      return {
        entryDate: dt.toISOString(),
        expectedGeneration,
        actualGeneration,
        energyVariance,
        revenueLoss,
        variancePercent,
        assetType: assets[offset % assets.length]
      };
    });
  }

  function formatCurrency(value) {
    return `₹${Math.round(value).toLocaleString('en-IN')}`;
  }

  function applyUserProfile(user) {
    const displayName = user?.name || 'EcoPulse User';
    const role = user?.role || 'analyst';
    const initials = displayName
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const topUser = document.getElementById('topbar-user');
    if (topUser) topUser.textContent = `${displayName} (${role})`;

    const sbName = document.querySelector('.sb-user-name');
    if (sbName) sbName.textContent = displayName;

    const sbRole = document.querySelector('.sb-user-role');
    if (sbRole) sbRole.textContent = role === 'admin' ? 'Platform Administrator' : 'Enterprise Asset Analyst';

    const sbAvatar = document.querySelector('.sb-avatar');
    if (sbAvatar) sbAvatar.textContent = initials || 'EU';
  }

  function formatDateShort(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  function computeMetrics(logs) {
    const totalRevenueLoss = logs.reduce((sum, l) => sum + l.revenueLoss, 0);
    const totalEnergyVariance = logs.reduce((sum, l) => sum + l.energyVariance, 0);
    const totalExpected = logs.reduce((sum, l) => sum + l.expectedGeneration, 0);
    const totalActual = logs.reduce((sum, l) => sum + l.actualGeneration, 0);
    const efficiencyPercent = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0;

    return {
      totalRevenueLoss,
      totalEnergyVariance,
      efficiencyPercent,
      incidentCount: logs.length
    };
  }

  function aggregateByDate(logs) {
    const dateMap = new Map();
    logs.forEach((log) => {
      const day = new Date(log.entryDate).toISOString().slice(0, 10);
      const existing = dateMap.get(day) || { expected: 0, actual: 0, loss: 0, variancePct: 0, count: 0 };
      existing.expected += log.expectedGeneration;
      existing.actual += log.actualGeneration;
      existing.loss += log.revenueLoss;
      existing.variancePct += log.variancePercent;
      existing.count += 1;
      dateMap.set(day, existing);
    });

    return [...dateMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, values]) => ({
        date,
        expected: Math.round(values.expected),
        actual: Math.round(values.actual),
        loss: Math.round(values.loss),
        avgVariancePct: values.count ? Number((values.variancePct / values.count).toFixed(2)) : 0
      }));
  }

  function updateKpiCards(logs) {
    const metrics = computeMetrics(logs);
    const statCards = document.querySelectorAll('.dash-kpis .stat-card');

    if (statCards[0]) statCards[0].querySelector('.stat-value').textContent = formatCurrency(metrics.totalRevenueLoss);
    if (statCards[1]) {
      statCards[1].querySelector('.stat-value').innerHTML = `${Math.round(metrics.totalEnergyVariance).toLocaleString('en-IN')} <span class="unit">kWh</span>`;
    }
    if (statCards[2]) {
      statCards[2].querySelector('.stat-value').innerHTML = `${metrics.efficiencyPercent.toFixed(1)} <span class="unit">%</span>`;
    }

    const reportKpis = document.querySelectorAll('.kpi-strip .kpi-item');
    if (reportKpis[0]) reportKpis[0].querySelector('.kpi-item-val').textContent = formatCurrency(metrics.totalRevenueLoss);
    if (reportKpis[1]) reportKpis[1].querySelector('.kpi-item-val').textContent = Math.round(metrics.totalEnergyVariance).toLocaleString('en-IN');
    if (reportKpis[2]) reportKpis[2].querySelector('.kpi-item-val').textContent = String(metrics.incidentCount);
    if (reportKpis[3]) reportKpis[3].querySelector('.kpi-item-val').textContent = `${(100 - metrics.efficiencyPercent).toFixed(1)}%`;

    const windowLabel = document.querySelector('.dash-filter > div:last-child');
    if (windowLabel) {
      const sorted = [...logs].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
      const from = sorted[0] ? formatDateShort(sorted[0].entryDate) : '-';
      const to = sorted[sorted.length - 1] ? formatDateShort(sorted[sorted.length - 1].entryDate) : '-';
      windowLabel.textContent = `Audit window: ${from} – ${to} · ${logs.length} observations`;
    }
  }

  function renderTable(logs) {
    const tbody = document.getElementById('var-tbody');
    if (!tbody) return;

    tbody.innerHTML = logs
      .map((r) => `
      <tr>
        <td class="date-cell">${new Date(r.entryDate).toISOString().slice(0, 10)}</td>
        <td class="mono">${Math.round(r.expectedGeneration).toLocaleString('en-IN')}</td>
        <td class="mono" style="font-weight:600">${Math.round(r.actualGeneration).toLocaleString('en-IN')}</td>
        <td class="loss-cell">${r.energyVariance > 0 ? Math.round(r.energyVariance).toLocaleString('en-IN') : '—'}</td>
        <td class="impact-cell">${r.revenueLoss > 0 ? `₹${Math.round(r.revenueLoss).toLocaleString('en-IN')}` : '—'}</td>
      </tr>`)
      .join('');
  }

  function buildChartConfig(aggregated) {
    const labels = aggregated.map((d) => formatDateShort(d.date));
    return {
      labels,
      actual: aggregated.map((d) => d.actual),
      expected: aggregated.map((d) => d.expected),
      losses: aggregated.map((d) => d.loss),
      variance: aggregated.map((d) => d.avgVariancePct)
    };
  }

  function formatCompactKWh(value) {
    if (Math.abs(value) >= 1000) {
      const k = value / 1000;
      return `${Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1)}k`;
    }
    return String(Math.round(value));
  }

  function destroyCharts() {
    Object.values(state.charts).forEach((chart) => {
      if (chart) chart.destroy();
    });
  }

  function renderCharts(logs) {
    const aggregated = aggregateByDate(logs);
    const chartData = buildChartConfig(aggregated);
    if (typeof window.Chart === 'undefined') return;
    const hasTrend = chartData.labels.length > 1;

    const tooltip = {
      backgroundColor: '#141c2e',
      titleColor: '#fff',
      bodyColor: 'rgba(255,255,255,0.7)',
      borderColor: 'rgba(34,197,94,0.25)',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8
    };
    const gridColor = 'rgba(0,0,0,0.04)';
    const tick = { color: '#9ca3af', font: { family: "'JetBrains Mono'", size: 9 } };

    destroyCharts();

    state.charts.portfolio = new Chart(document.getElementById('chart-portfolio'), {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Actual',
            data: chartData.actual,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.05)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: hasTrend ? 3 : 5,
            pointBackgroundColor: '#22c55e',
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5
          },
          {
            label: 'Expected',
            data: chartData.expected,
            borderColor: '#94a3b8',
            borderDash: [6, 4],
            fill: false,
            tension: 0.4,
            borderWidth: 1.5,
            pointRadius: hasTrend ? 2 : 5,
            pointBackgroundColor: '#94a3b8'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: { legend: { display: false }, tooltip },
        scales: {
          x: { grid: { color: gridColor }, ticks: tick },
          y: { grid: { color: gridColor }, ticks: { ...tick, callback: (v) => `${formatCompactKWh(v)} kWh` } }
        }
      }
    });

    state.charts.leakage = new Chart(document.getElementById('chart-leakage'), {
      type: 'bar',
      data: {
        labels: chartData.labels,
        datasets: [{ data: chartData.losses, backgroundColor: 'rgba(220,38,38,0.55)', borderRadius: 3, borderWidth: 0 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { ...tooltip, callbacks: { label: (ctx) => ` ₹${Math.round(ctx.parsed.y).toLocaleString('en-IN')}` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { ...tick, maxRotation: 45, font: { family: "'JetBrains Mono'", size: 8 } } },
          y: { grid: { color: gridColor }, ticks: { ...tick, callback: (v) => `₹${formatCompactKWh(v)}` } }
        }
      }
    });

    state.charts.efficiency = new Chart(document.getElementById('chart-efficiency'), {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            data: chartData.variance,
            borderColor: '#818cf8',
            backgroundColor: 'rgba(129,140,248,0.05)',
            fill: true,
            tension: 0.3,
            borderWidth: 1.5,
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip },
        scales: {
          x: { grid: { display: false }, ticks: { ...tick, maxRotation: 45, font: { family: "'JetBrains Mono'", size: 8 } } },
          y: { grid: { color: gridColor }, ticks: { ...tick, callback: (v) => `${v}%` } }
        }
      }
    });

    if (!hasTrend) {
      showToast('ℹ️ Add at least 2 observations to see full trend lines.');
    }
  }

  function currentLogs() {
    if (state.filteredAsset === 'all') return state.logs;
    return state.logs.filter((l) => l.assetType === state.filteredAsset);
  }

  function refreshUi() {
    const logs = currentLogs();
    if (!logs.length && state.filteredAsset !== 'all') {
      const fallback = state.logs.length ? state.logs : demoLogs();
      updateKpiCards(fallback);
      renderTable(fallback);
      renderCharts(fallback);
      showToast(`ℹ️ No ${state.filteredAsset} logs yet. Showing all assets.`);
      return;
    }
    updateKpiCards(logs);
    renderTable(logs);
    renderCharts(logs);
    window.EcoPulseState = {
      logs,
      user: state.user,
      metrics: computeMetrics(logs)
    };
  }

  async function loadLogs() {
    const data = await window.EcoPulseAPI.getLogs({
      page: state.pagination.page,
      limit: state.pagination.limit,
      assetType: state.filteredAsset
    });

    state.logs = data.items;
    if (!state.logs.length) {
      state.logs = demoLogs();
      showToast('ℹ️ Showing demo trend data. Add observations to replace it.');
    }
    state.pagination = { ...state.pagination, ...data.pagination };
    refreshUi();
  }

  function hydrateNotificationToggles() {
    const notificationsBody = Array.from(document.querySelectorAll('.card-title'))
      .find((el) => el.textContent.trim() === 'Notifications')
      ?.closest('.card')
      ?.querySelector('.card-body');

    if (!notificationsBody) return;
    if (!notificationsBody.textContent.includes('${[')) return;

    const items = [
      'Email alerts for anomalies',
      'Daily performance digest',
      'Weekly audit reminders',
      'AI-generated report delivery'
    ];

    notificationsBody.innerHTML = items
      .map(
        (n) => `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;color:var(--text2)">${n}</span>
        <div style="width:38px;height:20px;background:var(--green);border-radius:10px;position:relative;cursor:pointer;flex-shrink:0">
          <div style="width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;right:3px;top:3px;box-shadow:0 1px 3px rgba(0,0,0,0.2)"></div>
        </div>
      </div>`
      )
      .join('');
  }

  function setLoading(button, loadingText) {
    if (!button) return () => {};
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText;
    return () => {
      button.disabled = false;
      button.textContent = originalText;
    };
  }

  async function record() {
    const submitButton = document.getElementById('btn-record') || document.querySelector('button[onclick="record()"]');
    const stopLoading = setLoading(submitButton, 'Saving...');

    try {
      const payload = {
        assetType: document.getElementById('f-asset').value,
        entryDate: document.getElementById('f-date').value,
        tariff: Number(document.getElementById('f-tariff').value || 0),
        expectedGeneration: Number(document.getElementById('f-expected').value || 0),
        actualGeneration: Number(document.getElementById('f-actual').value || 0)
      };

      if (!payload.entryDate || payload.expectedGeneration <= 0 || payload.actualGeneration < 0) {
        throw new Error('Please enter valid date, expected generation, and actual generation');
      }

      let created;
      try {
        created = await window.EcoPulseAPI.createLog(payload);
      } catch (err) {
        if ((err.message || '').toLowerCase().includes('unauthorized')) {
          state.user = await window.EcoPulseAPI.ensureAuth();
          applyUserProfile(state.user);
          created = await window.EcoPulseAPI.createLog(payload);
        } else {
          throw err;
        }
      }
      state.logs.unshift(created);
      state.logs.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));

      document.getElementById('f-expected').value = '';
      document.getElementById('f-actual').value = '';

      refreshUi();
      showToast(`✅ Observation recorded — Loss: ${Math.round(created.energyVariance)} kWh · ${formatCurrency(created.revenueLoss)}`);
    } catch (error) {
      showToast(`⚠️ ${error.message}`);
    } finally {
      stopLoading();
    }
  }

  function chip(el) {
    const chips = el.parentElement.querySelectorAll('.chip');
    chips.forEach((c) => {
      c.classList.remove('on');
      c.classList.add('off');
    });
    el.classList.remove('off');
    el.classList.add('on');

    const label = el.textContent.trim().toLowerCase();
    if (label.includes('solar')) state.filteredAsset = 'solar';
    else if (label.includes('wind')) state.filteredAsset = 'wind';
    else if (label.includes('hybrid')) state.filteredAsset = 'hybrid';
    else if (label.includes('battery')) state.filteredAsset = 'battery';
    else state.filteredAsset = 'all';

    refreshUi();
    showToast(`Filtering: ${el.textContent.trim()}`);
  }

  function nav(page, el) {
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    document.querySelectorAll('.sb-item').forEach((i) => i.classList.remove('active'));
    document.querySelectorAll('.mobile-nav-item').forEach((i) => i.classList.remove('active'));
    document.getElementById(`panel-${page}`).classList.add('active');
    if (el) el.classList.add('active');
    const mobileItem = document.querySelector(`.mobile-nav-item[data-page="${page}"]`);
    if (mobileItem) mobileItem.classList.add('active');

    const m = pageMeta[page] || {};
    document.getElementById('topbar-title').textContent = m.title || page;
    document.getElementById('topbar-crumb').textContent = m.crumb || '';
  }

  function autofill() {
    const targets = { solar: 8500, wind: 12000, hybrid: 10200, battery: 4500 };
    const asset = document.getElementById('f-asset').value;
    const value = targets[asset] || 8500;
    document.getElementById('f-expected').value = value;
    showToast(`✨ AI suggested target: ${value.toLocaleString('en-IN')} kWh`);
  }

  function dismiss(btn) {
    const item = btn.closest('.alert-item');
    item.style.transition = 'all 0.3s';
    item.style.opacity = '0';
    item.style.transform = 'translateX(20px)';
    setTimeout(() => item.remove(), 300);
    showToast('✅ Alert dismissed');

    const badge = document.querySelector('.sb-item-badge');
    if (!badge) return;
    const count = Math.max(0, Number(badge.textContent) - 1);
    badge.textContent = String(count);
    if (count === 0) badge.style.display = 'none';
  }

  function exportPDF() {
    const activePanel = document.querySelector('.panel.active');
    const activePanelId = activePanel ? activePanel.id : null;
    const reportPanel = document.getElementById('panel-report');
    const reportNavEl = Array.from(document.querySelectorAll('.sb-item')).find((el) => el.textContent.includes('Analyst Report'));

    if (reportPanel && !reportPanel.classList.contains('active') && reportNavEl) {
      nav('report', reportNavEl);
    }

    const restoreAfterPrint = () => {
      if (!activePanelId || activePanelId === 'panel-report') return;
      const page = activePanelId.replace('panel-', '');
      const navEl = Array.from(document.querySelectorAll('.sb-item')).find((el) => {
        const text = el.textContent.toLowerCase();
        return (
          (page === 'dashboard' && text.includes('dashboard')) ||
          (page === 'alerts' && text.includes('alerts')) ||
          (page === 'portfolio' && text.includes('portfolio')) ||
          (page === 'settings' && text.includes('settings'))
        );
      });
      nav(page, navEl || undefined);
    };

    window.addEventListener('afterprint', restoreAfterPrint, { once: true });
    setTimeout(() => window.print(), 250);
  }

  let toastTimer;
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function attachCsvExport() {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Export All Logs (CSV)'));
    if (!btn) return;

    btn.onclick = async function exportCsv() {
      try {
        const csv = await window.EcoPulseAPI.getLogsCsv({ page: 1, limit: 100 });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ecopulse-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('✅ CSV export ready');
      } catch (error) {
        showToast(`⚠️ ${error.message}`);
      }
    };
  }

  async function init() {
    document.getElementById('topbar-date').textContent = new Date()
      .toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      .toUpperCase();

    document.getElementById('f-date').value = new Date().toISOString().split('T')[0];
    hydrateNotificationToggles();
    attachCsvExport();
    const logoutBtn = document.getElementById('btn-logout');

    try {
      await ensureChartJs();
      state.user = await window.EcoPulseAPI.ensureAuth();
      applyUserProfile(state.user);
      if (logoutBtn) {
        logoutBtn.style.display = 'inline-flex';
        logoutBtn.onclick = () => {
          window.EcoPulseAPI.logout();
          window.location.reload();
        };
      }
      await loadLogs();
      if (typeof window.Chart === 'undefined') {
        showToast('⚠️ Chart library blocked by browser settings.');
      }
    } catch (error) {
      state.logs = demoLogs();
      refreshUi();
      showToast(`⚠️ ${error.message}. Showing local demo data.`);
    }
  }

  window.nav = nav;
  window.chip = chip;
  window.autofill = autofill;
  window.record = record;
  window.dismiss = dismiss;
  window.exportPDF = exportPDF;
  window.showToast = showToast;

  window.addEventListener('load', init);
})();
