import { useState, useRef, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Moon, BookOpen, Smartphone, Activity, Sparkles, Wind, AlertTriangle, ChevronRight, Loader2 } from "lucide-react";

const RISK = {
  low:      { label: "Low",      color: "#4C6B5C", bg: "#EAF0EA" },
  moderate: { label: "Moderate", color: "#C08A2E", bg: "#F7EEDD" },
  high:     { label: "High",     color: "#B14A34", bg: "#F6E5E0" },
  severe:   { label: "Severe",   color: "#8B2E1F", bg: "#F2D9D2" },
};

function scoreEntry({ mood, sleep, study, screen, stress }) {
  const sleepDeficit = Math.max(0, 7 - sleep) * 8;
  const overwork = Math.max(0, study - 8) * 5;
  const screenExcess = Math.max(0, screen - 6) * 3;
  const stressContrib = stress * 6;
  const moodContrib = (10 - mood) * 4;
  const raw = sleepDeficit + overwork + screenExcess + stressContrib + moodContrib;
  const wellness = Math.max(0, Math.min(100, Math.round(100 - raw)));

  let level = "low";
  if (wellness < 20) level = "severe";
  else if (wellness < 40) level = "high";
  else if (wellness < 70) level = "moderate";

  const drivers = [
    { label: "Sleep debt", value: sleepDeficit, note: `${sleep}h sleep` },
    { label: "Overwork", value: overwork, note: `${study}h study/work` },
    { label: "Screen time", value: screenExcess, note: `${screen}h screen` },
    { label: "Stress", value: stressContrib, note: `${stress}/10 stress` },
    { label: "Low mood", value: moodContrib, note: `${mood}/10 mood` },
  ].sort((a, b) => b.value - a.value).filter(d => d.value > 0).slice(0, 3);

  return { wellness, level, drivers };
}

async function askClaude(prompt) {
  const res = await fetch("http://localhost:3001/api/insight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.map(b => b.text || "").join("\n") || "";
  return text.replace(/```json|```/g, "").trim();
}

function BreathingOrb({ level }) {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("Inhale");
  const timeoutRef = useRef(null);
  const speed = level === "severe" || level === "high" ? 3500 : 4500;

  useEffect(() => {
    if (!running) { clearTimeout(timeoutRef.current); return; }
    const phases = ["Inhale", "Hold", "Exhale", "Hold"];
    let i = 0;
    const step = () => {
      setPhase(phases[i % 4]);
      i++;
      timeoutRef.current = setTimeout(step, speed);
    };
    step();
    return () => clearTimeout(timeoutRef.current);
  }, [running, speed]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="rounded-full flex items-center justify-center text-white font-medium tracking-wide transition-transform"
        style={{
          width: 140, height: 140,
          background: "radial-gradient(circle at 35% 30%, #6B8A78, #33463B)",
          transform: running && (phase === "Inhale") ? "scale(1.25)" : running && phase === "Exhale" ? "scale(0.85)" : "scale(1)",
          transitionDuration: `${speed}ms`,
          transitionTimingFunction: "ease-in-out",
        }}
      >
        {running ? phase : "Ready"}
      </div>
      <button
        onClick={() => setRunning(r => !r)}
        className="px-4 py-2 rounded-full text-sm font-medium border border-[#4C6B5C] text-[#4C6B5C] hover:bg-[#4C6B5C] hover:text-white transition-colors"
      >
        {running ? "Stop" : "Start box breathing"}
      </button>
    </div>
  );
}

export default function EchoMind() {
  const [form, setForm] = useState({ mood: 6, sleep: 7, study: 6, screen: 5, stress: 5, journal: "" });
  const [entries, setEntries] = useState([]);
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: Number(e.target.value) }));

  const submit = async () => {
    const result = scoreEntry(form);
    const day = entries.length + 1;
    const entry = { day, ...form, ...result, date: new Date().toLocaleDateString() };
    setEntries(prev => [...prev, entry]);
    setInsight(null);
    setLoading(true);

    const prompt = `You are EchoMind, a calm and supportive mental-wellness assistant for a student. Based on this daily data, respond ONLY with JSON (no markdown, no preamble) in this exact shape:
{"explanation": "2-3 sentence explanation of WHY the risk level is what it is, referencing the specific numbers", "recoveryPlan": ["step 1", "step 2", "step 3"], "focusTip": "one short focus-mode suggestion"}

Data: mood=${form.mood}/10, sleep=${form.sleep}h, study/work=${form.study}h, screenTime=${form.screen}h, stress=${form.stress}/10, wellnessScore=${result.wellness}/100, riskLevel=${result.level}${form.journal ? `, journal="${form.journal}"` : ""}.
Keep recovery steps concrete and doable today. Tone: warm, non-clinical, no diagnosis.`;

    try {
      const raw = await askClaude(prompt);
      const parsed = JSON.parse(raw);
      setInsight(parsed);
    } catch (e) {
      setInsight({ explanation: "Couldn't reach the AI service right now, but your score above is based on your inputs.", recoveryPlan: ["Take a 10-minute break", "Get to bed 30 minutes earlier tonight", "Step outside for fresh air"], focusTip: "Try 25-minute focus blocks with 5-minute breaks." });
    }
    setLoading(false);
  };

  const generateWeekly = async () => {
    if (entries.length === 0) return;
    setReportLoading(true);
    const summary = entries.map(e => `Day ${e.day}: wellness=${e.wellness}, mood=${e.mood}, sleep=${e.sleep}h, stress=${e.stress}/10`).join("; ");
    const prompt = `You are EchoMind. Based on this week of a student's burnout-tracking data, respond ONLY with JSON: {"summary": "3-4 sentence trend summary", "improvement": "one specific area to improve", "encouragement": "one short encouraging line"}. Data: ${summary}`;
    try {
      const raw = await askClaude(prompt);
      setWeeklyReport(JSON.parse(raw));
    } catch (e) {
      setWeeklyReport({ summary: "Report unavailable right now — please try again.", improvement: "", encouragement: "" });
    }
    setReportLoading(false);
  };

  const latest = entries[entries.length - 1];
  const riskInfo = latest ? RISK[latest.level] : null;
  const isEmergency = latest && (latest.level === "severe" || form.stress === 10);

  return (
    <div className="min-h-screen w-full" style={{ background: "#F5F4EF", fontFamily: "'Source Serif 4', Georgia, serif" }}>
      <div className="max-w-3xl mx-auto px-5 py-8">
        <div className="flex items-center gap-3 mb-1">
          <Activity size={22} color="#4C6B5C" />
          <h1 className="text-2xl font-bold" style={{ color: "#23291F", fontFamily: "'Space Grotesk', sans-serif" }}>EchoMind</h1>
        </div>
        <p className="text-sm text-[#5C6459] mb-8">A daily pulse-check for burnout, before it becomes a crisis.</p>

        {isEmergency && (
          <div className="mb-6 p-4 rounded-xl flex items-start gap-3" style={{ background: RISK.severe.bg, border: `1px solid ${RISK.severe.color}44` }}>
            <AlertTriangle size={20} color={RISK.severe.color} className="mt-0.5 flex-shrink-0" />
            <div className="text-sm" style={{ color: "#5C2416" }}>
              <p className="font-medium mb-1">Your numbers today are in the severe range.</p>
              <p>If things feel like more than you can carry alone, please reach out — a counselor, a trusted person, or a crisis line (in the US: call or text 988; elsewhere, your local emergency or crisis line). This app is a tracker, not a substitute for support.</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
          <h2 className="text-base font-medium mb-4" style={{ color: "#23291F" }}>Today's check-in</h2>
          <div className="grid grid-cols-1 gap-4">
            <Slider icon={<Sparkles size={16} />} label="Mood" value={form.mood} onChange={set("mood")} min={1} max={10} />
            <Slider icon={<Moon size={16} />} label="Sleep (hours)" value={form.sleep} onChange={set("sleep")} min={0} max={12} />
            <Slider icon={<BookOpen size={16} />} label="Study / work (hours)" value={form.study} onChange={set("study")} min={0} max={16} />
            <Slider icon={<Smartphone size={16} />} label="Screen time (hours)" value={form.screen} onChange={set("screen")} min={0} max={16} />
            <Slider icon={<Activity size={16} />} label="Stress level" value={form.stress} onChange={set("stress")} min={1} max={10} />
            <div>
              <label className="text-sm text-[#5C6459] mb-1 block">Journal entry (optional)</label>
              <textarea
                className="w-full rounded-lg border border-[#DDD9CC] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4C6B5C]"
                rows={2}
                placeholder="How's today been?"
                value={form.journal}
                onChange={(e) => setForm(f => ({ ...f, journal: e.target.value }))}
              />
            </div>
          </div>
          <button
            onClick={submit}
            disabled={loading}
            className="mt-4 w-full py-2.5 rounded-lg text-white font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "#4C6B5C" }}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <>Get my burnout check <ChevronRight size={16} /></>}
          </button>
        </div>

        {latest && (
          <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-[#5C6459]">Wellness score</p>
                <p className="text-4xl font-bold" style={{ color: riskInfo.color }}>{latest.wellness}<span className="text-lg text-[#9A9587]">/100</span></p>
              </div>
              <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ background: riskInfo.bg, color: riskInfo.color }}>
                {riskInfo.label} risk
              </span>
            </div>

            {latest.drivers.length > 0 && (
              <div className="mb-4">
                <p className="text-xs uppercase tracking-wide text-[#9A9587] mb-2">Top contributing factors</p>
                <div className="flex flex-wrap gap-2">
                  {latest.drivers.map((d, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-[#F0EEE5] text-[#5C6459]">{d.label} · {d.note}</span>
                  ))}
                </div>
              </div>
            )}

            {insight && (
              <div className="border-t border-[#EFEBE0] pt-4 space-y-3">
                <p className="text-sm text-[#3A3F34] leading-relaxed">{insight.explanation}</p>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#9A9587] mb-2">Recovery plan</p>
                  <ol className="space-y-1.5">
                    {insight.recoveryPlan?.map((s, i) => (
                      <li key={i} className="text-sm text-[#3A3F34] flex gap-2">
                        <span className="font-medium text-[#4C6B5C]">{i + 1}.</span> {s}
                      </li>
                    ))}
                  </ol>
                </div>
                {insight.focusTip && (
                  <p className="text-sm text-[#7A6389] bg-[#F3EFF5] rounded-lg px-3 py-2">Focus tip: {insight.focusTip}</p>
                )}
              </div>
            )}
          </div>
        )}

        {entries.length > 1 && (
          <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
            <h2 className="text-base font-medium mb-3" style={{ color: "#23291F" }}>Wellness trend</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={entries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFEBE0" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9A9587" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#9A9587" }} />
                <ReferenceLine y={40} stroke="#C08A2E" strokeDasharray="4 4" />
                <Tooltip />
                <Line type="monotone" dataKey="wellness" stroke="#4C6B5C" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-medium mb-3" style={{ color: "#23291F" }}>Weekly report</h2>
            {weeklyReport ? (
              <div className="text-sm text-[#3A3F34] space-y-2">
                <p>{weeklyReport.summary}</p>
                {weeklyReport.improvement && <p className="text-[#C08A2E]">Focus on: {weeklyReport.improvement}</p>}
                {weeklyReport.encouragement && <p className="italic text-[#4C6B5C]">{weeklyReport.encouragement}</p>}
              </div>
            ) : (
              <p className="text-sm text-[#9A9587] mb-3">Log a few days, then generate an AI summary of your trends.</p>
            )}
            <button
              onClick={generateWeekly}
              disabled={entries.length === 0 || reportLoading}
              className="mt-3 text-sm font-medium text-[#4C6B5C] border border-[#4C6B5C] rounded-full px-3 py-1.5 disabled:opacity-40 flex items-center gap-1.5"
            >
              {reportLoading ? <Loader2 size={14} className="animate-spin" /> : null}
              {weeklyReport ? "Regenerate" : "Generate report"}
            </button>
          </div>

          <div className="bg-white rounded-2xl p-5 flex flex-col items-center justify-center shadow-sm">
            <div className="flex items-center gap-2 mb-3 self-start">
              <Wind size={16} color="#4C6B5C" />
              <h2 className="text-base font-medium" style={{ color: "#23291F" }}>Breathing exercise</h2>
            </div>
            <BreathingOrb level={latest?.level || "low"} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({ icon, label, value, onChange, min, max }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-[#5C6459] flex items-center gap-1.5">{icon} {label}</span>
        <span className="text-sm font-medium text-[#23291F]">{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={onChange} className="w-full accent-[#4C6B5C]" />
    </div>
  );
}