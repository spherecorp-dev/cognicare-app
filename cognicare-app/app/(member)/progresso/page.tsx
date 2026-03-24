"use client";

import { useState } from "react";
import { PROTOCOL_WEEKS } from "@/lib/data";
import { useProgress } from "@/lib/useProgress";
import { useUser } from "@/components/providers/UserProvider";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  CheckCircle2,
  Circle,
  Lock,
  Brain,
  Target,
  Flame,
  Calendar,
  ChevronDown,
  AlertTriangle,
  Sparkles,
  FlaskConical,
} from "lucide-react";

export default function ProgressoPage() {
  const { profile, userId } = useUser();
  const currentWeek = profile.current_week || 1;
  const progress = useProgress(userId, currentWeek);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(currentWeek);

  const completedWeeks = currentWeek - 1;
  const totalProgress = Math.round((completedWeeks / 8) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">My Progress</h1>
          <p className="text-surface-400 mt-1">
            8-Week Reconnection Map — track your cognitive regeneration journey step by step
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-4 text-center">
          <Calendar className="w-5 h-5 text-brand-400 mx-auto" />
          <p className="text-xl font-bold text-white mt-2">{currentWeek}/8</p>
          <p className="text-xs text-surface-400">Current Week</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <Target className="w-5 h-5 text-amber-400 mx-auto" />
          <p className="text-xl font-bold text-white mt-2">{totalProgress}%</p>
          <p className="text-xs text-surface-400">Overall Progress</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <Flame className="w-5 h-5 text-orange-400 mx-auto" />
          <p className="text-xl font-bold text-white mt-2">{progress.streak}</p>
          <p className="text-xs text-surface-400">Day Streak</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <Brain className="w-5 h-5 text-purple-400 mx-auto" />
          <p className="text-xl font-bold text-white mt-2">{profile.brain_score || 0}</p>
          <p className="text-xs text-surface-400">Brain Score</p>
        </div>
      </div>

      {/* Visual Timeline */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
          Protocol Timeline
        </h2>
        <div className="flex items-center gap-1">
          {PROTOCOL_WEEKS.map((week, i) => {
            const isCompleted = week.week < currentWeek;
            const isCurrent = week.week === currentWeek;
            return (
              <div key={week.week} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    isCompleted
                      ? "bg-brand-600 text-white"
                      : isCurrent
                      ? "bg-brand-600/20 text-brand-400 ring-2 ring-brand-500 ring-offset-2 ring-offset-surface-950"
                      : "bg-surface-800 text-surface-600"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    week.week
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] text-center leading-tight",
                    isCompleted
                      ? "text-brand-400"
                      : isCurrent
                      ? "text-white font-medium"
                      : "text-surface-600"
                  )}
                >
                  {week.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expandable Week Cards */}
      <div className="space-y-4">
        {PROTOCOL_WEEKS.map((week) => {
          const isCompleted = week.week < currentWeek;
          const isCurrent = week.week === currentWeek;
          const isLocked = week.week > currentWeek;
          const isExpanded = expandedWeek === week.week;

          return (
            <div key={week.week} className="flex gap-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all",
                    isCompleted
                      ? "bg-brand-600 border-brand-500 text-white"
                      : isCurrent
                      ? "bg-brand-600/20 border-brand-500 text-brand-400"
                      : "bg-surface-800 border-surface-700 text-surface-600"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isLocked ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-bold">{week.week}</span>
                  )}
                </div>
                {week.week < 8 && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 min-h-[20px]",
                      isCompleted ? "bg-brand-600" : "bg-surface-800"
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div
                className={cn(
                  "flex-1 glass rounded-2xl mb-2 overflow-hidden transition-all",
                  isLocked && "opacity-50",
                  isCurrent && "border-brand-800/40 glow-brand"
                )}
              >
                <button
                  onClick={() =>
                    !isLocked && setExpandedWeek(isExpanded ? null : week.week)
                  }
                  className="w-full p-4 flex items-center gap-3 text-left"
                  disabled={isLocked}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white text-sm">
                        Week {week.week}: {week.title}
                      </h3>
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-600/30 text-brand-400 font-medium">
                          CURRENT
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-600/20 text-brand-400">
                          COMPLETE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-surface-500 mt-0.5">{week.subtitle}</p>
                    <p className="text-xs text-surface-400 mt-1">
                      {week.milestone}
                    </p>
                  </div>
                  {!isLocked && (
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-surface-500 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                    />
                  )}
                </button>

                {isExpanded && !isLocked && (
                  <div className="px-4 pb-5 border-t border-surface-700/30 pt-4 space-y-5">
                    {/* Description */}
                    <p className="text-sm text-surface-300 leading-relaxed">
                      {week.description}
                    </p>

                    {/* Science Brief */}
                    <div className="p-3 rounded-xl bg-brand-950/20 border border-brand-900/20">
                      <h4 className="text-xs font-semibold text-brand-400 mb-1 flex items-center gap-1.5">
                        <FlaskConical className="w-3.5 h-3.5" /> Science Brief
                      </h4>
                      <p className="text-[11px] text-surface-400 leading-relaxed">
                        {week.scienceBrief}
                      </p>
                    </div>

                    {/* Tasks */}
                    <div>
                      <h4 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">
                        Tasks
                      </h4>
                      <div className="space-y-2">
                        {week.tasks.map((task) => {
                          const isDone = progress.isTaskCompleted(task.id) || isCompleted;
                          return (
                          <button
                            key={task.id}
                            onClick={() => !isCompleted && progress.toggleTask(task.id)}
                            className={cn(
                              "flex items-center gap-3 p-2.5 rounded-lg w-full text-left transition-all",
                              isDone
                                ? "bg-brand-950/20"
                                : "bg-surface-800/30 hover:bg-surface-800/50"
                            )}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-surface-600 flex-shrink-0" />
                            )}
                            <span
                              className={cn(
                                "text-sm flex-1",
                                isDone
                                  ? "text-surface-400 line-through"
                                  : "text-surface-300"
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

                    {/* Expected Changes */}
                    <div>
                      <h4 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Expected Changes
                      </h4>
                      <div className="space-y-1.5">
                        {week.expectedChanges.map((change, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-surface-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                            {change}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Warning Sign */}
                    <div className="p-3 rounded-xl bg-amber-950/10 border border-amber-900/20">
                      <h4 className="text-xs font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Watch For
                      </h4>
                      <p className="text-[11px] text-surface-400 leading-relaxed">
                        {week.warningSign}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
