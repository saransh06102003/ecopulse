function buildGeminiPrompt({ metrics, trends, anomalies, logs }) {
  return `You are an enterprise renewable-energy financial analyst.

Analyze the portfolio data and return STRICT JSON only with this exact schema:
{
  "executiveSummary": "string",
  "keyFindings": ["string"],
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "recommendations": ["string"]
}

Required analysis points:
1) Total revenue loss and what it implies financially.
2) Variance trends over time (upward/downward, volatility).
3) Worst performing asset with supporting reason.
4) Root-cause hypothesis based on evidence, not generic causes.
5) Financial recovery potential in practical terms.

Rules:
- Keep executiveSummary concise but specific.
- keyFindings must be 3 to 6 bullets.
- recommendations must be 3 to 6 action items with operational and financial relevance.
- Do not include markdown or any text outside JSON.

Metrics:
${JSON.stringify(metrics, null, 2)}

Trend summary:
${JSON.stringify(trends, null, 2)}

Detected anomalies:
${JSON.stringify(anomalies, null, 2)}

Input logs (most recent first):
${JSON.stringify(logs, null, 2)}
`;
}

module.exports = { buildGeminiPrompt };
