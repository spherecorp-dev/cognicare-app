"use client";

import { useMemo } from "react";
import { DAILY_PROTOCOL } from "@/lib/data";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Sunrise,
  Sun,
  Moon,
  ArrowRight,
  CheckCircle2,
  Clock,
  Play,
} from "lucide-react";

const timeIcon: Record<string, React.ElementType> = {
  morning: Sunrise,
  midday: Sun,
  afternoon: Sun,
  evening: Moon,
};

const periodLabel: Record<string, string> = {
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  evening: "Evening",
};

function getCurrentTimeOfDay(): "morning" | "midday" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 11) return "morning";
  if (hour < 14) return "midday";
  if (hour < 17) return "afternoon";
  return "evening";
}

function getActiveStepIndex(): number {
  const hour = new Date().getHours();
  if (hour < 8) return 0;       // Morning Cleanse
  if (hour < 11) return 1;      // Bacopa Protocol
  if (hour < 14) return 2;      // Neuroprotective Stack
  if (hour < 17) return 3;      // Brain Exercise
  return 4;                      // Evening Elixir
}

interface Props {
  completedSteps?: number[];
  onCompleteStep?: (step: number) => void;
}

export default function WhatToDoNow({ completedSteps = [], onCompleteStep }: Props) {
  const activeIndex = useMemo(() => getActiveStepIndex(), []);
  const currentPeriod = useMemo(() => getCurrentTimeOfDay(), []);
  const activeStep = DAILY_PROTOCOL[activeIndex];
  const ActiveIcon = timeIcon[activeStep.timeOfDay] || Sun;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Active Step Header */}
      <div className="p-5 bg-gradient-to-r from-brand-600/10 to-brand-500/5 border-b border-brand-800/20">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-brand-400 uppercase tracking-wider">
            {periodLabel[currentPeriod]} — Do This Now
          </span>
        </div>
        <div className="flex items-start gap-4 mt-3">
          <div className="p-2.5 rounded-xl bg-brand-600/20">
            <ActiveIcon className="w-5 h-5 text-brand-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">{activeStep.title}</h3>
            <p className="text-xs text-surface-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {activeStep.timing}
            </p>
            <p className="text-sm text-surface-300 mt-2 leading-relaxed">
              {activeStep.instructions[0]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <Link
            href="/protocolo"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600/20 text-brand-400 text-sm hover:bg-brand-600/30 transition-colors"
          >
            <Play className="w-3.5 h-3.5" /> View Full Instructions
          </Link>
          {onCompleteStep && !completedSteps.includes(activeStep.step) && (
            <button
              onClick={() => onCompleteStep(activeStep.step)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-800/60 text-surface-300 text-sm hover:bg-surface-700/60 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
            </button>
          )}
          {completedSteps.includes(activeStep.step) && (
            <span className="flex items-center gap-1.5 text-xs text-brand-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
            </span>
          )}
        </div>
      </div>

      {/* Timeline of all steps */}
      <div className="p-4">
        <div className="flex items-center gap-1">
          {DAILY_PROTOCOL.map((step, i) => {
            const isActive = i === activeIndex;
            const isPast = i < activeIndex;
            const isCompleted = completedSteps.includes(step.step);
            const Icon = timeIcon[step.timeOfDay] || Sun;

            return (
              <div key={step.step} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    isCompleted
                      ? "bg-brand-600 text-white"
                      : isActive
                      ? "bg-brand-600/20 text-brand-400 ring-2 ring-brand-500 ring-offset-2 ring-offset-surface-950"
                      : isPast
                      ? "bg-surface-700 text-surface-400"
                      : "bg-surface-800 text-surface-600"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[9px] text-center leading-tight",
                    isActive ? "text-brand-400 font-medium" : "text-surface-500"
                  )}
                >
                  {step.timing.split("–")[0].trim().replace(/\s*(AM|PM)/, "")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
