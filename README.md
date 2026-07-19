EchoMind AI
An AI-powered burnout tracker that predicts mental burnout before it happens — not just "you're stressed," but why, plus a personalized recovery plan.
What it does
Daily check-in — log mood, sleep, study/work hours, screen time, stress level, and an optional journal entry
Burnout risk score — a weighted 0–100 wellness score computed instantly from your inputs (Low / Moderate / High / Severe)
AI explanation — Claude explains which factors are driving your score, in plain language
Personalized recovery plan — a concrete, 3-step plan generated for your specific day
Wellness trend chart — tracks your score over time
Weekly AI report — a summary of your patterns once you've logged a few days
Breathing exercise — a guided box-breathing animation, paced to your current stress level
Emergency support banner — surfaces automatically if your score hits the severe range
Tech stack
Frontend: React + Vite + Tailwind CSS, Recharts for charts, Lucide for icons
Backend: Node.js + Express (proxies requests to the Anthropic API so the API key stays server-side)
AI: Claude (Anthropic API)
