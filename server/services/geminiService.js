function parseJsonResponse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Ollama response did not contain valid JSON');
    return JSON.parse(match[0]);
  }
}

async function generateEnterpriseReport(prompt) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.1:8b';

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.2,
        top_p: 0.95
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const parsed = parseJsonResponse(payload.response || '{}');

  const normalized = {
    executiveSummary: String(parsed.executiveSummary || '').trim(),
    keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings.map(String) : [],
    riskLevel: String(parsed.riskLevel || 'MEDIUM').toUpperCase(),
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : []
  };

  return { normalized, raw: parsed };
}

module.exports = { generateEnterpriseReport };
