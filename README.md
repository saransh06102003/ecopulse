# EcoPulse V2.1 SaaS Upgrade

Production-ready full-stack implementation using:
- Client: HTML/CSS/vanilla JS + Chart.js
- Server: Node.js + Express (MVC)
- Database: MongoDB + Mongoose
- AI: Ollama (local, server-side only)
- Auth: JWT (register/login)

## Setup

1. Install dependencies:
   - `npm install`
2. Configure env:
   - `cp .env.example .env`
   - Fill `MONGO_URI`, `JWT_SECRET`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
3. Install and start Ollama:
   - `brew install ollama`
   - `ollama serve`
4. Pull a model (new terminal):
   - `ollama pull llama3.1:8b`
5. Run app:
   - `npm run dev`
6. Open:
   - `http://127.0.0.1:5001/index.html`

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/logs`
- `GET /api/logs`
- `POST /api/generate-report`

Bonus:
- CSV export: `GET /api/logs?format=csv`
- Pagination: `GET /api/logs?page=1&limit=25`
- Role-based access via `role` (`admin`, `analyst`)
- Anomaly detection before AI report generation
- Audit timestamps via `createdAt`/`updatedAt`

## Prompt Template

Template is implemented in:
- `server/utils/promptTemplate.js`

Output schema:
```json
{
  "executiveSummary": "",
  "keyFindings": [],
  "riskLevel": "",
  "recommendations": []
}
```
