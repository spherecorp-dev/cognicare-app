"use client";

import { useState } from "react";
import { TierGate } from "@/components/TierGate";
import {
  Crown,
  Star,
  BookOpen,
  Play,
  TrendingUp,
  Search,
  Calendar,
  Users,
  CheckSquare,
  Square,
  Clock,
} from "lucide-react";
import { useUser } from "@/components/providers/UserProvider";

const videoLessons = [
  {
    title: "Understanding Cadmium Neurotoxicity",
    duration: "18 min",
    description:
      "How cadmium crosses the blood-brain barrier, accumulates in neural tissue, and disrupts synaptic signaling. The foundational science behind everything in the protocol.",
  },
  {
    title: "The Chelation Process Explained",
    duration: "22 min",
    description:
      "Step-by-step breakdown of how natural chelating agents bind to cadmium ions and facilitate safe elimination through your body's detox pathways.",
  },
  {
    title: "Optimizing Your Neural Recovery",
    duration: "15 min",
    description:
      "Timing, stacking, and lifestyle factors that accelerate neuroplasticity during the chelation window. How to maximize each week of recovery.",
  },
  {
    title: "Advanced Supplementation Strategies",
    duration: "20 min",
    description:
      "Beyond the basics: synergistic compounds, bioavailability optimization, and the latest research on absorption enhancers for key protocol nutrients.",
  },
  {
    title: "Reading Your Body's Signals",
    duration: "12 min",
    description:
      "How to interpret detox symptoms, cognitive fluctuations, and energy patterns. Know when to push forward and when to adjust your protocol pace.",
  },
  {
    title: "Long-Term Brain Maintenance",
    duration: "25 min",
    description:
      "Life after the initial 8-week protocol. Maintenance dosing, periodic re-assessment, and building lasting habits for lifelong cognitive protection.",
  },
];

const schedule = [
  { day: "Mon", event: "New research summary posted", type: "research" },
  { day: "Tue", event: "Dr. Cox case study (written article)", type: "article" },
  { day: "Wed", event: "Protocol optimization tip", type: "tip" },
  { day: "Thu", event: "Member spotlight + success story", type: "story" },
  { day: "Fri", event: "Weekly brain health digest", type: "digest" },
];

const typeColor: Record<string, string> = {
  research: "bg-purple-600/20 text-purple-400",
  article: "bg-blue-600/20 text-blue-400",
  tip: "bg-emerald-600/20 text-emerald-400",
  story: "bg-amber-600/20 text-amber-400",
  digest: "bg-indigo-600/20 text-indigo-400",
};

const auditItems = [
  "Check tap water cadmium levels (home test kit)",
  "Inspect ceramic cookware for lead/cadmium glaze",
  "Audit rice consumption frequency (high cadmium accumulator)",
  "Review leafy greens sourcing (organic vs conventional)",
  "Check chocolate/cocoa product origins",
  "Inspect older painted surfaces for cadmium pigments",
  "Review nickel-cadmium battery storage",
  "Audit fertilizer brands used in garden",
  "Check proximity to industrial emissions",
  "Review children's toy paint certifications",
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getRenewalDate(startDate: string): string {
  const date = new Date(startDate);
  date.setDate(date.getDate() + 30);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CirclePage() {
  const { profile } = useUser();
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <TierGate tier="circle">
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700">
          <Crown className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            CogniCare Family Protection Circle
          </h1>
          <p className="text-surface-400 mt-1">
            $37/month — Exclusive ongoing support
          </p>
        </div>
      </div>

      {/* Membership Status */}
      <div className="glass rounded-2xl p-6 border-purple-800/30 bg-purple-950/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600/20">
              <Star className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Active Member</p>
              <p className="text-xs text-surface-400">
                Since {formatDate(profile.start_date)} — Renewal:{" "}
                {getRenewalDate(profile.start_date)}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-purple-600/20 text-purple-400 text-xs font-medium">
            $37/month
          </span>
        </div>
      </div>

      {/* Science Library Access */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-purple-600/20 flex-shrink-0">
            <BookOpen className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">Science Library Access</h3>
            <p className="text-sm text-surface-400 mt-1.5 leading-relaxed">
              <span className="text-white font-medium">Exclusive Research Updates</span>{" "}
              — Monthly deep-dives into the latest cadmium research, new compound
              discoveries, and protocol optimization findings from Dr. Cox&apos;s team.
              Premium articles updated weekly with peer-reviewed sources.
            </p>
            <a
              href="/ciencia"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 text-purple-400 text-sm hover:bg-purple-600/30 transition-colors"
            >
              <BookOpen className="w-4 h-4" /> Browse Science Library
            </a>
          </div>
        </div>
      </div>

      {/* Video Lesson Modules */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-purple-400" />
          Video Lesson Modules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {videoLessons.map((lesson, index) => (
            <div key={index} className="glass rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-600/20 flex-shrink-0">
                  <Play className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-sm">
                    {lesson.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-3 h-3 text-surface-500" />
                    <span className="text-[10px] text-surface-500">
                      {lesson.duration}
                    </span>
                  </div>
                  <p className="text-xs text-surface-400 mt-1.5 leading-relaxed">
                    {lesson.description}
                  </p>
                  <button className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-400 text-xs hover:bg-purple-600/30 transition-colors">
                    <Play className="w-3 h-3" /> Watch
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Optimization Reports */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-purple-600/20 flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">
              Monthly Optimization Reports
            </h3>
            <p className="text-sm text-surface-400 mt-1.5 leading-relaxed">
              Data-driven insights from <span className="text-white font-medium">12,000+ active members</span>.
              Your protocol evolves with the science.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div className="bg-surface-800/40 rounded-xl p-3">
                <p className="text-xs text-purple-400 font-medium">Age Group Analysis</p>
                <p className="text-[11px] text-surface-400 mt-1">
                  What works best for your demographic — dosage, timing, and compound selection
                </p>
              </div>
              <div className="bg-surface-800/40 rounded-xl p-3">
                <p className="text-xs text-purple-400 font-medium">New Compound Discoveries</p>
                <p className="text-[11px] text-surface-400 mt-1">
                  Latest research findings on chelation enhancers and neuroprotective agents
                </p>
              </div>
              <div className="bg-surface-800/40 rounded-xl p-3">
                <p className="text-xs text-purple-400 font-medium">Seasonal Adjustments</p>
                <p className="text-[11px] text-surface-400 mt-1">
                  How diet, sunlight, and activity changes affect your protocol effectiveness
                </p>
              </div>
              <div className="bg-surface-800/40 rounded-xl p-3">
                <p className="text-xs text-purple-400 font-medium">Dosage Refinements</p>
                <p className="text-[11px] text-surface-400 mt-1">
                  Precision adjustments based on aggregated member progress data
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 47-Point Home Audit Checklist */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-purple-400" />
            47-Point Home Audit Checklist
          </h2>
          <span className="px-3 py-1 rounded-full bg-purple-600/20 text-purple-400 text-xs font-medium">
            {checkedItems.size}/10 items checked
          </span>
        </div>

        <p className="text-sm text-surface-400 mb-4">
          Identify and eliminate cadmium exposure sources in your home, water supply,
          and diet. Here are the 10 most critical items to start with:
        </p>

        {/* Progress bar */}
        <div className="w-full h-2 bg-surface-800/60 rounded-full mb-5">
          <div
            className="h-2 bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-300"
            style={{ width: `${(checkedItems.size / 10) * 100}%` }}
          />
        </div>

        <div className="space-y-2">
          {auditItems.map((item, index) => (
            <button
              key={index}
              onClick={() => toggleItem(index)}
              className="w-full flex items-start gap-3 p-3 rounded-xl bg-surface-800/40 hover:bg-surface-800/60 transition-colors text-left"
            >
              {checkedItems.has(index) ? (
                <CheckSquare className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Square className="w-5 h-5 text-surface-500 flex-shrink-0 mt-0.5" />
              )}
              <span
                className={`text-sm ${
                  checkedItems.has(index)
                    ? "text-surface-500 line-through"
                    : "text-surface-300"
                }`}
              >
                {item}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Content Schedule */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-400" />
          Weekly Content Schedule
        </h2>

        <p className="text-sm text-surface-400 mb-4">
          New content delivered inside the app every week:
        </p>

        <div className="space-y-2">
          {schedule.map((item) => (
            <div
              key={item.day}
              className="flex items-center gap-4 p-3 rounded-xl bg-surface-800/40"
            >
              <span className="text-sm font-bold text-surface-300 w-10">
                {item.day}
              </span>
              <span className="flex-1 text-sm text-surface-300">
                {item.event}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${typeColor[item.type]}`}
              >
                {item.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Member Network */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Member Network</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-surface-800/40 rounded-xl p-4">
            <p className="text-2xl font-bold text-purple-400">12,847</p>
            <p className="text-xs text-surface-400 mt-1">Active families</p>
          </div>
          <div className="bg-surface-800/40 rounded-xl p-4">
            <p className="text-2xl font-bold text-purple-400">4,128</p>
            <p className="text-xs text-surface-400 mt-1">Documented recoveries</p>
          </div>
          <div className="bg-surface-800/40 rounded-xl p-4">
            <p className="text-2xl font-bold text-purple-400">342</p>
            <p className="text-xs text-surface-400 mt-1">New insights this week</p>
          </div>
        </div>
      </div>
    </div>
    </TierGate>
  );
}
