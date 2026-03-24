"use client";

import { useState } from "react";
import { PROTOCOL_WEEKS, DAILY_PROTOCOL, DAILY_TIPS } from "@/lib/data";
import { useProgress } from "@/lib/useProgress";
import { useUser } from "@/components/providers/UserProvider";
import { cn } from "@/lib/utils";
import WhatToDoNow from "@/components/WhatToDoNow";
import {
  Brain,
  Zap,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  ChefHat,
  BookOpen,
  ArrowRight,
  Flame,
  Target,
  Shield,
  Sunrise,
  Sun,
  Moon,
  Sparkles,
  Gift,
} from "lucide-react";
import Link from "next/link";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-surface-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          <p className="text-xs text-surface-500 mt-1">{sub}</p>
        </div>
        <div className={cn("p-2.5 rounded-xl", color)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { profile, userId } = useUser();
  const progress = useProgress(userId, profile.current_week || 1);
  const currentWeek = PROTOCOL_WEEKS[(profile.current_week || 1) - 1];
  const brainGain = progress.brainScore - 60;

  const weekTasks = currentWeek.tasks;
  const completedCount = weekTasks.filter((t) => progress.isTaskCompleted(t.id)).length;
  const progressPercent = Math.round(((profile.current_week || 1) / 8) * 100);

  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const handleCompleteStep = (step: number) => {
    setCompletedSteps((prev) => [...prev, step]);
    progress.checkinToday();
  };

  const firstName = profile.full_name?.split(" ")[0] || "Member";

  // Dynamic daily tip based on protocol day
  const startDate = new Date(profile.start_date);
  const today = new Date();
  const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const tipIndex = Math.max(0, Math.min(daysSinceStart, DAILY_TIPS.length - 1));
  const dailyTip = DAILY_TIPS[tipIndex];

  // Getting started items for week 1
  const gettingStarted = [
    { id: "gs1", label: "Complete the onboarding introduction", done: profile.onboarding_complete },
    { id: "gs2", label: "Read the full Daily Protocol (5 steps)", done: progress.isTaskCompleted("w1t1") },
    { id: "gs3", label: "Purchase your base ingredients", done: progress.isTaskCompleted("w1t2") },
    { id: "gs4", label: "Complete your first Morning Cleanse Tonic", done: progress.isTaskCompleted("w1t3") },
    { id: "gs5", label: "Record your baseline brain fog level", done: progress.isTaskCompleted("w1t4") },
  ];
  const gettingStartedDone = gettingStarted.filter((g) => g.done).length;
  const showGettingStarted = (profile.current_week || 1) <= 1 && gettingStartedDone < gettingStarted.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {firstName}
        </h1>
        <p className="text-surface-400 mt-1">
          Week {profile.current_week || 1} of 8 — {currentWeek.title}
        </p>
      </div>

      {/* Daily Check-in Banner */}
      {!progress.todayCheckedIn && (
        <button
          onClick={() => progress.checkinToday()}
          className="w-full glass rounded-2xl p-5 border border-brand-800/30 bg-brand-950/10 hover:bg-brand-950/20 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-brand-600/20">
              <Sparkles className="w-5 h-5 text-brand-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">Daily Check-In</p>
              <p className="text-xs text-surface-400 mt-0.5">
                Tap to confirm you are following the protocol today — keep your streak alive!
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-brand-600/20 text-brand-400 text-sm font-medium group-hover:bg-brand-600/30 transition-colors">
              Check In
            </div>
          </div>
        </button>
      )}

      {progress.todayCheckedIn && (
        <div className="glass rounded-2xl p-4 border border-brand-800/20 bg-brand-950/5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-brand-500" />
            <p className="text-sm text-brand-400 font-medium">
              Checked in today — {progress.streak} day streak!
            </p>
          </div>
        </div>
      )}

      {/* Getting Started (Week 1 only) */}
      {showGettingStarted && (
        <div className="glass rounded-2xl p-6 border border-amber-800/20 bg-amber-950/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-amber-600/20">
              <Gift className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">Getting Started</h2>
              <p className="text-xs text-surface-400">
                {gettingStartedDone}/{gettingStarted.length} complete — your first steps to cognitive clarity
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {gettingStarted.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-lg",
                  item.done ? "bg-brand-950/20" : "bg-surface-800/30"
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-surface-600 flex-shrink-0" />
                )}
                <span
                  className={cn(
                    "text-sm",
                    item.done ? "text-surface-400 line-through" : "text-surface-300"
                  )}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 h-1.5 bg-surface-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${(gettingStartedDone / gettingStarted.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* What to Do Now */}
      <WhatToDoNow
        completedSteps={completedSteps}
        onCompleteStep={handleCompleteStep}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Calendar}
          label="Current Week"
          value={`${profile.current_week || 1}/8`}
          sub={currentWeek.title}
          color="bg-brand-600/20 text-brand-400"
        />
        <StatCard
          icon={Target}
          label="Overall Progress"
          value={`${progressPercent}%`}
          sub={`${completedCount}/${weekTasks.length} this week`}
          color="bg-amber-600/20 text-amber-400"
        />
        <StatCard
          icon={Flame}
          label="Day Streak"
          value={`${progress.streak}`}
          sub={progress.todayCheckedIn ? "Active today" : "Check in to continue"}
          color="bg-orange-600/20 text-orange-400"
        />
        <StatCard
          icon={Brain}
          label="Brain Score"
          value={`${progress.brainScore}`}
          sub={`+${brainGain} since starting the protocol`}
          color="bg-purple-600/20 text-purple-400"
        />
      </div>

      {/* Weekly Progress Bar */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-400" />
            Protocol Progress
          </h2>
          <span className="text-sm text-brand-400 font-medium">{progressPercent}%</span>
        </div>

        <div className="flex items-center gap-1 mb-3">
          {PROTOCOL_WEEKS.map((week, i) => (
            <div key={week.week} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "h-2 w-full rounded-full transition-all",
                  i < (profile.current_week || 1)
                    ? "bg-gradient-to-r from-brand-600 to-brand-400"
                    : i === (profile.current_week || 1)
                    ? "bg-surface-700 relative overflow-hidden"
                    : "bg-surface-800"
                )}
              />
              <span
                className={cn(
                  "text-[10px]",
                  i < (profile.current_week || 1)
                    ? "text-brand-400"
                    : i === (profile.current_week || 1)
                    ? "text-surface-300"
                    : "text-surface-600"
                )}
              >
                W{week.week}
              </span>
            </div>
          ))}
        </div>

        <p className="text-sm text-surface-400">
          <span className="text-brand-400 font-medium">This week&apos;s milestone:</span>{" "}
          {currentWeek.milestone}
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks of the Week */}
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-brand-400" />
              Week {profile.current_week || 1} Tasks
            </h2>
            <span className="text-xs text-surface-500">
              {completedCount}/{weekTasks.length} complete
            </span>
          </div>

          <p className="text-sm text-surface-400 mb-5">{currentWeek.description}</p>

          <div className="space-y-3">
            {weekTasks.map((task) => {
              const isDone = progress.isTaskCompleted(task.id);
              return (
                <button
                  key={task.id}
                  onClick={() => progress.toggleTask(task.id)}
                  className={cn(
                    "flex items-center gap-3 w-full p-3 rounded-xl text-left transition-all",
                    isDone
                      ? "bg-brand-950/30 border border-brand-800/30"
                      : "bg-surface-800/40 border border-surface-700/30 hover:border-surface-600/50"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                      isDone
                        ? "border-brand-500 bg-brand-500"
                        : "border-surface-600"
                    )}
                  >
                    {isDone && (
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm flex-1",
                      isDone
                        ? "text-surface-400 line-through"
                        : "text-surface-200"
                    )}
                  >
                    {task.label}
                  </span>
                  {task.duration && (
                    <span className="text-[10px] text-surface-600">{task.duration}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Quick Access */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
              Quick Access
            </h3>
            <div className="space-y-2">
              <Link
                href="/protocolo"
                className="flex items-center gap-3 p-3 rounded-xl bg-brand-950/30 border border-brand-900/40 hover:border-brand-700/50 transition-all group"
              >
                <BookOpen className="w-5 h-5 text-brand-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">Daily Protocol</p>
                  <p className="text-xs text-surface-500">5-step daily guide</p>
                </div>
                <ArrowRight className="w-4 h-4 text-surface-600 group-hover:text-brand-400 transition-colors" />
              </Link>

              <Link
                href="/acelerador"
                className="flex items-center gap-3 p-3 rounded-xl bg-amber-950/20 border border-amber-900/30 hover:border-amber-700/40 transition-all group"
              >
                <Zap className="w-5 h-5 text-amber-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">Neural Accelerator</p>
                  <p className="text-xs text-surface-500">Results 4–5x faster</p>
                </div>
                <ArrowRight className="w-4 h-4 text-surface-600 group-hover:text-amber-400 transition-colors" />
              </Link>

              <Link
                href="/receitas"
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/40 border border-surface-700/30 hover:border-surface-600/50 transition-all group"
              >
                <ChefHat className="w-5 h-5 text-surface-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">Brain Recipes</p>
                  <p className="text-xs text-surface-500">8 activation preparations</p>
                </div>
                <ArrowRight className="w-4 h-4 text-surface-600 group-hover:text-surface-300 transition-colors" />
              </Link>
            </div>
          </div>

          {/* Brain Health Score */}
          <div className="glass rounded-2xl p-5 glow-brand">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-brand-600/20">
                <Brain className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <p className="text-sm text-surface-400">Brain Health Score</p>
                <p className="text-xs text-surface-500">Estimated from protocol progress</p>
              </div>
            </div>

            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-gradient-brand">{progress.brainScore}</span>
              <span className="text-surface-400 text-sm mb-1">/100</span>
            </div>

            <div className="mt-3 h-2 bg-surface-800 rounded-full overflow-hidden">
              <div className="progress-bar h-full" style={{ width: `${progress.brainScore}%` }} />
            </div>

            <p className="text-xs text-surface-500 mt-2">
              +{brainGain} points since starting the protocol
            </p>
          </div>

          {/* Daily Tip */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                  Daily Tip
                </span>
              </div>
              <span className="text-[10px] text-surface-500">
                Day {daysSinceStart + 1} of 56
              </span>
            </div>
            <p className="text-sm text-surface-300 leading-relaxed">
              {dailyTip}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
