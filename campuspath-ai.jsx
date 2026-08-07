import React, { useState } from "react";
import {
  Github,
  Compass,
  Flag,
  CheckCircle2,
  Circle,
  Loader2,
  TriangleAlert,
  RotateCcw,
  Sparkles,
  Mountain,
} from "lucide-react";

const COLORS = {
  bg: "#14231A",
  panel: "#1F3327",
  panelLight: "#28402F",
  parchment: "#F3EEDF",
  parchmentDim: "#E7DFC7",
  ink: "#241F17",
  amber: "#C97B2E",
  amberBright: "#E0954A",
  moss: "#6B8F63",
  sage: "#A9BFA0",
  clay: "#B5482F",
  line: "#3A5240",
};

const FONTS = {
  display: "'Fraunces', 'Georgia', serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'IBM Plex Mono', 'Courier New', monospace",
};

function cleanJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callClaude(system, user) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message || JSON.stringify(errBody);
    } catch (_) {
      detail = await res.text().catch(() => "");
    }
    throw new Error(`API error ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  const data = await res.json();
  return data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

const SYSTEM_PROMPT =
  "You are a career coach for university students. Respond with ONLY valid JSON, no markdown fences, no commentary, no text outside the JSON object.";

export default function CampusPathAI() {
  const [stage, setStage] = useState("setup"); // setup | generating | roadmap
  const [form, setForm] = useState({
    username: "",
    skills: "",
    interests: "",
    targetRole: "",
  });
  const [profile, setProfile] = useState(null);
  const [skillGap, setSkillGap] = useState(null);
  const [months, setMonths] = useState([]);
  const [genStatus, setGenStatus] = useState("");
  const [completed, setCompleted] = useState({});
  const [error, setError] = useState(null);
  const [adapting, setAdapting] = useState(false);
  const [adaptNotes, setAdaptNotes] = useState("");
  const [showAdaptBox, setShowAdaptBox] = useState(false);

  function updateForm(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleWeek(monthNumber, weekNumber) {
    const key = `${monthNumber}-${weekNumber}`;
    setCompleted((c) => ({ ...c, [key]: !c[key] }));
  }

  function isMonthComplete(month) {
    return month.weeks.every((w) => completed[`${month.monthNumber}-${w.weekNumber}`]);
  }

  async function handleStart() {
    setError(null);
    if (!form.username.trim() || !form.targetRole.trim()) {
      setError("Add at least a GitHub username and a target role before you set out.");
      return;
    }
    setStage("generating");
    setMonths([]);
    setCompleted({});
    setGenStatus("Scouting your GitHub trail...");

    let ghProfile = null;
    let langSummary = "";
    try {
      const pRes = await fetch(`https://api.github.com/users/${form.username.trim()}`);
      if (pRes.ok) {
        ghProfile = await pRes.json();
        const rRes = await fetch(
          `https://api.github.com/users/${form.username.trim()}/repos?sort=updated&per_page=5`
        );
        if (rRes.ok) {
          const repos = await rRes.json();
          langSummary = [...new Set(repos.map((r) => r.language).filter(Boolean))].join(", ");
        }
      }
    } catch (e) {
      // continue without a GitHub profile
    }
    setProfile(ghProfile ? { ...ghProfile, langSummary } : null);

    setGenStatus("Reading the terrain ahead — mapping skill gaps...");
    let gap;
    try {
      const text = await callClaude(
        SYSTEM_PROMPT,
        `Student profile:\n- GitHub username: ${form.username}\n- Public repos: ${
          ghProfile?.public_repos ?? "unknown"
        }\n- Bio: ${ghProfile?.bio ?? "none"}\n- Recently used languages: ${
          langSummary || "unknown"
        }\n- Self-reported current skills: ${form.skills || "none listed"}\n- Interests: ${
          form.interests || "none listed"
        }\n- Target role: ${form.targetRole}\n\nReturn JSON exactly in this shape:\n{"summary": "one or two sentence overview of where they stand relative to the target role", "strengths": ["...","...","..."], "gaps": ["...","...","..."]}\nKeep each strength/gap under 8 words. 3-5 items each.`
      );
      gap = cleanJson(text);
    } catch (e) {
      setError(`The trail guide hit a snag: ${e.message || e}`);
      setStage("setup");
      return;
    }
    setSkillGap(gap);

    const generated = [];
    for (let m = 1; m <= 6; m++) {
      setGenStatus(`Blazing month ${m} of 6...`);
      try {
        const text = await callClaude(
          SYSTEM_PROMPT,
          `Target role: ${form.targetRole}\nInterests: ${
            form.interests || "none listed"
          }\nCurrent skills: ${form.skills || "none listed"}\nKey gaps to close: ${(
            gap.gaps || []
          ).join("; ")}\nThis is month ${m} of a 6-month roadmap.\nPrevious months' themes: ${
            generated.map((mo) => mo.theme).join(" -> ") || "none yet, this is the first month"
          }\n\nDesign month ${m} (weeks ${(m - 1) * 4 + 1} to ${
            m * 4
          }) building logically on previous months. Return ONLY this JSON shape:\n{"theme":"short month theme under 6 words","weeks":[{"weekNumber":${
            (m - 1) * 4 + 1
          },"title":"short focus under 8 words","resources":["resource 1","resource 2"],"projectIdea":"one concrete task under 20 words","skillFocus":"1-3 word tag"}] — include exactly 4 week objects, weekNumber ${
            (m - 1) * 4 + 1
          } through ${m * 4}}`
        );
        const monthData = cleanJson(text);
        generated.push({ monthNumber: m, ...monthData });
        setMonths([...generated]);
      } catch (e) {
        setError(
          `The trail went quiet mapping month ${m} — here's what's charted so far. Use "Adapt plan" to keep going.`
        );
        break;
      }
    }
    setGenStatus("");
    setStage("roadmap");
  }

  async function handleAdapt() {
    setAdapting(true);
    setError(null);
    const remaining = months.filter((mo) => !isMonthComplete(mo));
    if (remaining.length === 0) {
      setAdapting(false);
      setShowAdaptBox(false);
      return;
    }
    const doneThemes = months.filter((mo) => isMonthComplete(mo)).map((mo) => mo.theme);
    const updated = [...months];
    for (const mo of remaining) {
      setGenStatus(`Re-charting month ${mo.monthNumber}...`);
      try {
        const text = await callClaude(
          SYSTEM_PROMPT,
          `Target role: ${form.targetRole}\nInterests: ${
            form.interests || "none listed"
          }\nCurrent skills: ${form.skills || "none listed"}\nKey gaps to close: ${(
            skillGap?.gaps || []
          ).join("; ")}\nProgress notes from student: ${
            adaptNotes || "no notes provided"
          }\nMonths already completed: ${
            doneThemes.join(" -> ") || "none"
          }\nRe-design month ${mo.monthNumber} (weeks ${(mo.monthNumber - 1) * 4 + 1} to ${
            mo.monthNumber * 4
          }), taking the progress notes into account — reinforce weak spots, don't repeat mastered material. Return ONLY this JSON shape:\n{"theme":"short month theme under 6 words","weeks":[{"weekNumber":${
            (mo.monthNumber - 1) * 4 + 1
          },"title":"short focus under 8 words","resources":["resource 1","resource 2"],"projectIdea":"one concrete task under 20 words","skillFocus":"1-3 word tag"}] — include exactly 4 week objects}`
        );
        const monthData = cleanJson(text);
        const idx = updated.findIndex((x) => x.monthNumber === mo.monthNumber);
        updated[idx] = { monthNumber: mo.monthNumber, ...monthData };
        setMonths([...updated]);
      } catch (e) {
        setError(`Couldn't re-chart month ${mo.monthNumber} — the rest of your plan is untouched.`);
      }
    }
    setGenStatus("");
    setAdapting(false);
    setShowAdaptBox(false);
    setAdaptNotes("");
  }

  const totalWeeks = months.reduce((s, mo) => s + mo.weeks.length, 0);
  const completedCount = Object.values(completed).filter(Boolean).length;
  const progressPct = totalWeeks ? Math.round((completedCount / totalWeeks) * 100) : 0;

  return (
    <div
      style={{
        backgroundColor: COLORS.bg,
        backgroundImage: `repeating-radial-gradient(circle at 20% 10%, transparent 0, transparent 40px, ${COLORS.line}22 41px, transparent 42px), repeating-radial-gradient(circle at 80% 60%, transparent 0, transparent 55px, ${COLORS.line}1a 56px, transparent 57px)`,
        minHeight: "100vh",
        fontFamily: FONTS.body,
        color: COLORS.sage,
      }}
      className="w-full"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,600&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.5s ease-out both; }
        @keyframes dashMove { to { stroke-dashoffset: -24; } }
        .cp-input:focus { outline: 2px solid ${COLORS.amberBright}; outline-offset: 2px; }
        .cp-btn:focus-visible { outline: 2px solid ${COLORS.amberBright}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          .fade-up { animation: none; }
        }
      `}</style>

      <div className="max-w-2xl mx-auto px-5 py-12">
        {/* Hero / trailhead sign */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3" style={{ color: COLORS.amber }}>
            <Compass size={22} />
            <span style={{ fontFamily: FONTS.mono, fontSize: "12px", letterSpacing: "0.15em" }}>
              CAMPUSPATH AI
            </span>
          </div>
          <h1
            style={{
              fontFamily: FONTS.display,
              fontWeight: 900,
              fontSize: "clamp(28px, 6vw, 42px)",
              color: COLORS.parchment,
              lineHeight: 1.1,
            }}
          >
            Chart your route to{" "}
            <span style={{ color: COLORS.amberBright, fontStyle: "italic", fontWeight: 600 }}>
              {form.targetRole.trim() || "the role you want"}
            </span>
          </h1>
          <p className="mt-3" style={{ fontSize: "15px", color: COLORS.sage }}>
            A personalised 6-month trail, built from your GitHub profile and skills.
          </p>
        </div>

        {error && (
          <div
            className="fade-up flex items-start gap-2 mb-6 px-4 py-3 rounded"
            style={{ backgroundColor: "#3A241C", border: `1px solid ${COLORS.clay}`, color: "#E8C4B5" }}
          >
            <TriangleAlert size={18} className="shrink-0 mt-0.5" />
            <span style={{ fontSize: "14px" }}>{error}</span>
          </div>
        )}

        {stage === "setup" && (
          <div
            className="fade-up rounded-lg p-6"
            style={{ backgroundColor: COLORS.parchment, color: COLORS.ink }}
          >
            <label className="block mb-4">
              <span
                className="flex items-center gap-1.5 mb-1.5"
                style={{ fontFamily: FONTS.mono, fontSize: "12px", letterSpacing: "0.05em" }}
              >
                <Github size={14} /> GITHUB USERNAME
              </span>
              <input
                className="cp-input w-full px-3 py-2 rounded border"
                style={{ borderColor: "#C9BFA0", backgroundColor: "#FFFDF7" }}
                placeholder="e.g. octocat"
                value={form.username}
                onChange={(e) => updateForm("username", e.target.value)}
              />
            </label>

            <label className="block mb-4">
              <span
                className="block mb-1.5"
                style={{ fontFamily: FONTS.mono, fontSize: "12px", letterSpacing: "0.05em" }}
              >
                CURRENT SKILLS
              </span>
              <input
                className="cp-input w-full px-3 py-2 rounded border"
                style={{ borderColor: "#C9BFA0", backgroundColor: "#FFFDF7" }}
                placeholder="e.g. Python, basic SQL, React"
                value={form.skills}
                onChange={(e) => updateForm("skills", e.target.value)}
              />
            </label>

            <label className="block mb-4">
              <span
                className="block mb-1.5"
                style={{ fontFamily: FONTS.mono, fontSize: "12px", letterSpacing: "0.05em" }}
              >
                INTERESTS
              </span>
              <input
                className="cp-input w-full px-3 py-2 rounded border"
                style={{ borderColor: "#C9BFA0", backgroundColor: "#FFFDF7" }}
                placeholder="e.g. distributed systems, developer tools"
                value={form.interests}
                onChange={(e) => updateForm("interests", e.target.value)}
              />
            </label>

            <label className="block mb-6">
              <span
                className="block mb-1.5"
                style={{ fontFamily: FONTS.mono, fontSize: "12px", letterSpacing: "0.05em" }}
              >
                TARGET ROLE
              </span>
              <input
                className="cp-input w-full px-3 py-2 rounded border"
                style={{ borderColor: "#C9BFA0", backgroundColor: "#FFFDF7" }}
                placeholder="e.g. Backend Developer at a startup"
                value={form.targetRole}
                onChange={(e) => updateForm("targetRole", e.target.value)}
              />
            </label>

            <button
              className="cp-btn w-full py-3 rounded font-semibold flex items-center justify-center gap-2"
              style={{ backgroundColor: COLORS.amber, color: "#FFF8EC" }}
              onClick={handleStart}
            >
              <Flag size={16} /> Chart my path
            </button>
          </div>
        )}

        {stage === "generating" && (
          <div className="fade-up flex flex-col items-center gap-4 py-16">
            <Loader2 size={32} className="animate-spin" style={{ color: COLORS.amberBright }} />
            <p style={{ fontFamily: FONTS.mono, fontSize: "13px", color: COLORS.sage }}>
              {genStatus}
            </p>
            {months.length > 0 && (
              <p style={{ fontSize: "13px", color: COLORS.sage }}>
                {months.length} of 6 months mapped so far
              </p>
            )}
          </div>
        )}

        {stage === "roadmap" && (
          <div className="fade-up">
            {profile && (
              <div
                className="flex items-center gap-3 mb-6 px-4 py-3 rounded"
                style={{ backgroundColor: COLORS.panel }}
              >
                {profile.avatar_url && (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    width={40}
                    height={40}
                    style={{ borderRadius: "50%" }}
                  />
                )}
                <div style={{ fontSize: "13px" }}>
                  <div style={{ color: COLORS.parchment, fontWeight: 600 }}>
                    @{form.username} · {profile.public_repos ?? "?"} public repos
                  </div>
                  {profile.langSummary && (
                    <div style={{ fontFamily: FONTS.mono, fontSize: "12px", color: COLORS.sage }}>
                      {profile.langSummary}
                    </div>
                  )}
                </div>
              </div>
            )}

            {skillGap && (
              <div className="mb-8 rounded-lg p-5" style={{ backgroundColor: COLORS.panel }}>
                <p style={{ fontSize: "14px", color: COLORS.parchment, marginBottom: "14px" }}>
                  {skillGap.summary}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(skillGap.strengths || []).map((s, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full"
                      style={{
                        fontSize: "12px",
                        fontFamily: FONTS.mono,
                        backgroundColor: "#2B4030",
                        color: COLORS.moss,
                        border: `1px solid ${COLORS.moss}55`,
                      }}
                    >
                      + {s}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(skillGap.gaps || []).map((g, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full"
                      style={{
                        fontSize: "12px",
                        fontFamily: FONTS.mono,
                        backgroundColor: "#3A241C",
                        color: "#D99B7E",
                        border: `1px solid ${COLORS.clay}55`,
                      }}
                    >
                      gap: {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* progress bar */}
            <div className="mb-8">
              <div className="flex justify-between mb-1.5" style={{ fontSize: "12px" }}>
                <span style={{ fontFamily: FONTS.mono, color: COLORS.sage }}>TRAIL PROGRESS</span>
                <span style={{ fontFamily: FONTS.mono, color: COLORS.amberBright }}>
                  {progressPct}% · {completedCount}/{totalWeeks} weeks
                </span>
              </div>
              <div className="w-full rounded-full h-2" style={{ backgroundColor: COLORS.panel }}>
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${progressPct}%`,
                    backgroundColor: COLORS.amber,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>

            {/* the trail */}
            <div className="relative pl-6" style={{ borderLeft: `2px dashed ${COLORS.line}` }}>
              {months.map((month) => (
                <div key={month.monthNumber} className="mb-9 -ml-6">
                  <div
                    className="inline-flex items-center gap-2 mb-4 px-4 py-2"
                    style={{
                      backgroundColor: "#5C4530",
                      color: COLORS.parchment,
                      fontFamily: FONTS.display,
                      fontWeight: 700,
                      fontSize: "15px",
                      transform: month.monthNumber % 2 === 0 ? "rotate(-0.6deg)" : "rotate(0.6deg)",
                      borderRadius: "3px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                    }}
                  >
                    <Mountain size={15} />
                    Month {month.monthNumber} — {month.theme}
                  </div>

                  <div className="pl-2">
                    {month.weeks.map((week) => {
                      const key = `${month.monthNumber}-${week.weekNumber}`;
                      const done = !!completed[key];
                      return (
                        <div key={key} className="flex gap-3 mb-4">
                          <button
                            className="cp-btn shrink-0 mt-0.5"
                            onClick={() => toggleWeek(month.monthNumber, week.weekNumber)}
                            aria-label={done ? "Mark week incomplete" : "Mark week complete"}
                            style={{ color: done ? COLORS.moss : COLORS.sage }}
                          >
                            {done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                          </button>
                          <div
                            className="flex-1 rounded-md px-4 py-3"
                            style={{
                              backgroundColor: COLORS.panel,
                              opacity: done ? 0.6 : 1,
                              borderLeft: `3px solid ${done ? COLORS.moss : COLORS.amber}`,
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span
                                style={{
                                  fontFamily: FONTS.mono,
                                  fontSize: "11px",
                                  color: COLORS.amberBright,
                                  letterSpacing: "0.05em",
                                }}
                              >
                                WEEK {week.weekNumber}
                              </span>
                              <span
                                style={{
                                  fontFamily: FONTS.mono,
                                  fontSize: "10px",
                                  color: COLORS.sage,
                                  textDecoration: done ? "line-through" : "none",
                                }}
                              >
                                {week.skillFocus}
                              </span>
                            </div>
                            <div
                              style={{
                                color: COLORS.parchment,
                                fontWeight: 600,
                                fontSize: "14px",
                                marginBottom: "6px",
                                textDecoration: done ? "line-through" : "none",
                              }}
                            >
                              {week.title}
                            </div>
                            {week.resources && week.resources.length > 0 && (
                              <ul style={{ fontSize: "12.5px", color: COLORS.sage, marginBottom: "6px" }}>
                                {week.resources.map((r, i) => (
                                  <li key={i}>· {r}</li>
                                ))}
                              </ul>
                            )}
                            {week.projectIdea && (
                              <div
                                className="flex items-start gap-1.5 mt-2"
                                style={{ fontSize: "12.5px", color: COLORS.amberBright }}
                              >
                                <Sparkles size={13} className="mt-0.5 shrink-0" />
                                <span>{week.projectIdea}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 -ml-6" style={{ color: COLORS.amber }}>
                <Flag size={18} />
                <span style={{ fontFamily: FONTS.mono, fontSize: "12px" }}>TRAIL'S END</span>
              </div>
            </div>

            {/* adapt plan */}
            <div className="mt-10 rounded-lg p-5" style={{ backgroundColor: COLORS.panel }}>
              {!showAdaptBox ? (
                <button
                  className="cp-btn flex items-center gap-2 mx-auto"
                  style={{
                    color: COLORS.amberBright,
                    fontFamily: FONTS.mono,
                    fontSize: "13px",
                  }}
                  onClick={() => setShowAdaptBox(true)}
                >
                  <RotateCcw size={15} /> Adapt remaining plan
                </button>
              ) : (
                <div>
                  <p style={{ fontSize: "13px", color: COLORS.parchment, marginBottom: "8px" }}>
                    What's working, what's hard? This reshapes every month you haven't finished yet.
                  </p>
                  <textarea
                    className="cp-input w-full px-3 py-2 rounded mb-3"
                    style={{
                      backgroundColor: COLORS.parchment,
                      color: COLORS.ink,
                      fontSize: "13px",
                      minHeight: "70px",
                    }}
                    placeholder="e.g. SQL is clicking fast, but I'm stuck on Docker networking"
                    value={adaptNotes}
                    onChange={(e) => setAdaptNotes(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      className="cp-btn px-4 py-2 rounded font-semibold flex items-center gap-2"
                      style={{ backgroundColor: COLORS.amber, color: "#FFF8EC", fontSize: "13px" }}
                      onClick={handleAdapt}
                      disabled={adapting}
                    >
                      {adapting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      {adapting ? genStatus || "Re-charting..." : "Re-chart the trail"}
                    </button>
                    <button
                      className="cp-btn px-4 py-2 rounded"
                      style={{ color: COLORS.sage, fontSize: "13px" }}
                      onClick={() => setShowAdaptBox(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
