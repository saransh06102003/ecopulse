(function reportModule() {
  const genSteps = [
    'Validating operational data…',
    'Running financial leakage model…',
    'Detecting anomalies…',
    'Computing variance attribution…',
    'Generating executive insights…',
    'Finalising report…'
  ];

  function renderExecSummary(ai, anomalies) {
    const exec = document.getElementById('exec-summary');
    if (!exec) return;

    const findings = (ai.keyFindings || []).map((x) => `<li style="margin:4px 0">${x}</li>`).join('');
    const recommendations = (ai.recommendations || []).map((x) => `<li style="margin:4px 0">${x}</li>`).join('');

    exec.innerHTML = `
      <div class="ai-box">
        <div class="ai-box-tag">AI Analysis · ${ai.riskLevel || 'MEDIUM'} Risk</div>
        <div class="ai-box-text">${ai.executiveSummary || 'No summary generated.'}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px">
        <div class="insight-card">
          <div class="insight-name" style="margin-bottom:6px">Key Findings</div>
          <ul style="padding-left:18px;font-size:12px;color:var(--text2);line-height:1.5">${findings || '<li>No findings provided.</li>'}</ul>
        </div>
        <div class="insight-card">
          <div class="insight-name" style="margin-bottom:6px">Recommendations</div>
          <ul style="padding-left:18px;font-size:12px;color:var(--text2);line-height:1.5">${recommendations || '<li>No recommendations provided.</li>'}</ul>
        </div>
      </div>
      <div style="margin-top:12px;font-size:11px;color:var(--muted)">Anomalies detected: ${anomalies?.length || 0}</div>
    `;
  }

  async function generate() {
    const btn = document.getElementById('gen-btn');
    const spinner = document.getElementById('spinner');
    const label = document.getElementById('gen-label');

    try {
      btn.disabled = true;
      spinner.style.display = 'block';

      let i = 0;
      const interval = setInterval(() => {
        if (i < genSteps.length) label.textContent = genSteps[i++];
      }, 500);

      const report = await window.EcoPulseAPI.generateReport({});
      clearInterval(interval);

      renderExecSummary(report.ai, report.anomalies);
      const reportNavEl = Array.from(document.querySelectorAll('.sb-item')).find((el) => el.textContent.includes('Analyst Report'));
      if (window.nav && reportNavEl) window.nav('report', reportNavEl);
      if (window.showToast) window.showToast('✅ Enterprise Report generated successfully');
    } catch (error) {
      if (window.showToast) window.showToast(`⚠️ ${error.message}`);
    } finally {
      btn.disabled = false;
      spinner.style.display = 'none';
      label.textContent = 'Regenerate Report →';
    }
  }

  window.generate = generate;
})();
