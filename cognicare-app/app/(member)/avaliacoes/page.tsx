"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/components/providers/UserProvider";
import { createClient } from "@/lib/supabase/client";
import {
  ClipboardCheck,
  Brain,
  Eye,
  Moon,
  Activity,
  CheckCircle2,
  Info,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AssessmentType = "brain_fog" | "memory_check" | "focus_score" | "sleep_quality";

interface AssessmentState {
  brain_fog: number;
  memory_check: boolean[];
  focus_score: number;
  sleep_quality: number;
}

const MEMORY_QUESTIONS = [
  "I can recall what I had for breakfast yesterday",
  "I can remember names of people I met this week",
  "I can follow multi-step instructions without writing them down",
  "I can recall where I placed common items (keys, phone)",
  "I can remember appointments without constant reminders",
];

function getSliderLabel(type: "brain_fog" | "focus_score" | "sleep_quality", value: number) {
  const labels: Record<string, { range: [number, number]; text: string }[]> = {
    brain_fog: [
      { range: [1, 3], text: "Minimal fog — thinking feels clear" },
      { range: [4, 6], text: "Moderate fog — occasional difficulty concentrating" },
      { range: [7, 10], text: "Severe fog — persistent confusion and memory issues" },
    ],
    focus_score: [
      { range: [1, 3], text: "Easily distracted, can't sustain attention" },
      { range: [4, 6], text: "Can focus with effort, occasional wandering" },
      { range: [7, 10], text: "Strong focus, sustained concentration" },
    ],
    sleep_quality: [
      { range: [1, 3], text: "Poor sleep, frequent waking" },
      { range: [4, 6], text: "Adequate sleep, could be better" },
      { range: [7, 10], text: "Excellent sleep, wake refreshed" },
    ],
  };

  const match = labels[type].find((l) => value >= l.range[0] && value <= l.range[1]);
  return match?.text || "";
}

export default function AvaliacoesPage() {
  const { profile, userId } = useUser();
  const supabase = createClient();

  const [assessments, setAssessments] = useState<AssessmentState>({
    brain_fog: 5,
    memory_check: [false, false, false, false, false],
    focus_score: 5,
    sleep_quality: 5,
  });

  const [saving, setSaving] = useState<AssessmentType | null>(null);
  const [saved, setSaved] = useState<Set<AssessmentType>>(new Set());
  const [lastAssessed, setLastAssessed] = useState<string | null>(null);

  // Load last assessment date
  useEffect(() => {
    async function loadLastAssessment() {
      try {
        const { data } = await supabase
          .from("assessments")
          .select("created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (data?.created_at) {
          setLastAssessed(data.created_at);
        }
      } catch {
        // Table may not exist yet — silently ignore
      }
    }
    loadLastAssessment();
  }, [userId, supabase]);

  const memoryScore = assessments.memory_check.filter(Boolean).length * 2;

  async function saveAssessment(type: AssessmentType) {
    setSaving(type);

    let score: number;
    let answers: Record<string, unknown>;

    switch (type) {
      case "brain_fog":
        score = assessments.brain_fog;
        answers = { value: assessments.brain_fog };
        break;
      case "memory_check":
        score = memoryScore;
        answers = {
          questions: MEMORY_QUESTIONS.map((q, i) => ({
            question: q,
            answer: assessments.memory_check[i],
          })),
        };
        break;
      case "focus_score":
        score = assessments.focus_score;
        answers = { value: assessments.focus_score };
        break;
      case "sleep_quality":
        score = assessments.sleep_quality;
        answers = { value: assessments.sleep_quality };
        break;
    }

    try {
      await supabase.from("assessments").insert({
        user_id: userId,
        type,
        score,
        answers,
      });

      setSaved((prev) => new Set(prev).add(type));
      setLastAssessed(new Date().toISOString());
    } catch {
      // Silently fail if table doesn't exist yet
    }

    setSaving(null);
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400">
          <ClipboardCheck className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Cognitive Assessments</h1>
          <p className="text-surface-400 mt-0.5">
            Track your cognitive recovery with weekly self-assessments
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="glass rounded-2xl p-4 border border-brand-800/20 bg-brand-950/5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-surface-300 leading-relaxed">
              Complete these assessments weekly to track your progress. Your scores
              contribute to your Brain Health Score.
            </p>
            {lastAssessed && (
              <p className="text-xs text-surface-500 mt-1.5">
                Last assessed: {formatDate(lastAssessed)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Assessment Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Brain Fog Scale */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-red-600/20">
              <Activity className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Brain Fog Scale</h2>
              <p className="text-xs text-surface-500">Rate your current brain fog level</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">Clear</span>
              <span className="text-2xl font-bold text-white">
                {assessments.brain_fog}
              </span>
              <span className="text-xs text-surface-500">Severe</span>
            </div>

            <input
              type="range"
              min={1}
              max={10}
              value={assessments.brain_fog}
              onChange={(e) =>
                setAssessments((prev) => ({
                  ...prev,
                  brain_fog: parseInt(e.target.value),
                }))
              }
              className="w-full h-2 rounded-full appearance-none bg-surface-700 accent-brand-500 cursor-pointer"
            />

            <p className="text-sm text-surface-400 text-center min-h-[40px]">
              {getSliderLabel("brain_fog", assessments.brain_fog)}
            </p>

            <button
              onClick={() => saveAssessment("brain_fog")}
              disabled={saving === "brain_fog" || saved.has("brain_fog")}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                saved.has("brain_fog")
                  ? "bg-brand-600/20 text-brand-400 border border-brand-800/30"
                  : "bg-brand-600 hover:bg-brand-500 text-white"
              )}
            >
              {saved.has("brain_fog") ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />{" "}
                  {saving === "brain_fog" ? "Saving..." : "Save Assessment"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Memory Check */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-purple-600/20">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Memory Check</h2>
              <p className="text-xs text-surface-500">5 questions about your recall ability</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {MEMORY_QUESTIONS.map((question, idx) => (
              <button
                key={idx}
                onClick={() =>
                  setAssessments((prev) => {
                    const newChecks = [...prev.memory_check];
                    newChecks[idx] = !newChecks[idx];
                    return { ...prev, memory_check: newChecks };
                  })
                }
                className={cn(
                  "flex items-center gap-3 w-full p-3 rounded-xl text-left transition-all text-sm",
                  assessments.memory_check[idx]
                    ? "bg-brand-950/30 border border-brand-800/30"
                    : "bg-surface-800/40 border border-surface-700/30 hover:border-surface-600/50"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    assessments.memory_check[idx]
                      ? "border-brand-500 bg-brand-500"
                      : "border-surface-600"
                  )}
                >
                  {assessments.memory_check[idx] && (
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  )}
                </div>
                <span
                  className={cn(
                    assessments.memory_check[idx]
                      ? "text-surface-300"
                      : "text-surface-400"
                  )}
                >
                  {question}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-surface-500">Score</span>
            <span className="text-lg font-bold text-white">{memoryScore}/10</span>
          </div>

          <button
            onClick={() => saveAssessment("memory_check")}
            disabled={saving === "memory_check" || saved.has("memory_check")}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
              saved.has("memory_check")
                ? "bg-brand-600/20 text-brand-400 border border-brand-800/30"
                : "bg-brand-600 hover:bg-brand-500 text-white"
            )}
          >
            {saved.has("memory_check") ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />{" "}
                {saving === "memory_check" ? "Saving..." : "Save Assessment"}
              </>
            )}
          </button>
        </div>

        {/* 3. Focus Score */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-blue-600/20">
              <Eye className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Focus Score</h2>
              <p className="text-xs text-surface-500">Rate your ability to concentrate</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">Distracted</span>
              <span className="text-2xl font-bold text-white">
                {assessments.focus_score}
              </span>
              <span className="text-xs text-surface-500">Focused</span>
            </div>

            <input
              type="range"
              min={1}
              max={10}
              value={assessments.focus_score}
              onChange={(e) =>
                setAssessments((prev) => ({
                  ...prev,
                  focus_score: parseInt(e.target.value),
                }))
              }
              className="w-full h-2 rounded-full appearance-none bg-surface-700 accent-brand-500 cursor-pointer"
            />

            <p className="text-sm text-surface-400 text-center min-h-[40px]">
              {getSliderLabel("focus_score", assessments.focus_score)}
            </p>

            <button
              onClick={() => saveAssessment("focus_score")}
              disabled={saving === "focus_score" || saved.has("focus_score")}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                saved.has("focus_score")
                  ? "bg-brand-600/20 text-brand-400 border border-brand-800/30"
                  : "bg-brand-600 hover:bg-brand-500 text-white"
              )}
            >
              {saved.has("focus_score") ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />{" "}
                  {saving === "focus_score" ? "Saving..." : "Save Assessment"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4. Sleep Quality */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-indigo-600/20">
              <Moon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Sleep Quality</h2>
              <p className="text-xs text-surface-500">Rate your recent sleep quality</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">Poor</span>
              <span className="text-2xl font-bold text-white">
                {assessments.sleep_quality}
              </span>
              <span className="text-xs text-surface-500">Excellent</span>
            </div>

            <input
              type="range"
              min={1}
              max={10}
              value={assessments.sleep_quality}
              onChange={(e) =>
                setAssessments((prev) => ({
                  ...prev,
                  sleep_quality: parseInt(e.target.value),
                }))
              }
              className="w-full h-2 rounded-full appearance-none bg-surface-700 accent-brand-500 cursor-pointer"
            />

            <p className="text-sm text-surface-400 text-center min-h-[40px]">
              {getSliderLabel("sleep_quality", assessments.sleep_quality)}
            </p>

            <button
              onClick={() => saveAssessment("sleep_quality")}
              disabled={saving === "sleep_quality" || saved.has("sleep_quality")}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                saved.has("sleep_quality")
                  ? "bg-brand-600/20 text-brand-400 border border-brand-800/30"
                  : "bg-brand-600 hover:bg-brand-500 text-white"
              )}
            >
              {saved.has("sleep_quality") ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />{" "}
                  {saving === "sleep_quality" ? "Saving..." : "Save Assessment"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
