"use client";

import { useState } from "react";
import { DAILY_PROTOCOL } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Brain,
  Shield,
  Beaker,
  Leaf,
  ChevronDown,
  Sunrise,
  Sun,
  Moon,
  Lightbulb,
  FlaskConical,
  ShoppingCart,
  Sparkles,
} from "lucide-react";

const timeIcon: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  morning: { icon: Sunrise, color: "text-amber-400 bg-amber-600/20", label: "Morning" },
  midday: { icon: Sun, color: "text-yellow-400 bg-yellow-600/20", label: "Midday" },
  afternoon: { icon: Sun, color: "text-orange-400 bg-orange-600/20", label: "Afternoon" },
  evening: { icon: Moon, color: "text-indigo-400 bg-indigo-600/20", label: "Evening" },
};

const bonuses = [
  {
    title: "CogniCare Science Library",
    description:
      "Access our growing library of science-backed articles explaining the research behind every ingredient and protocol step. Updated weekly with the latest findings in neuroscience and cadmium chelation.",
    status: "Full access",
    icon: "🔬",
  },
  {
    title: '"Stay Sharp" Digital Book',
    description:
      "Complete digital copy with complementary strategies for maintaining a sharp mind long-term. Covers nutrition, sleep optimization, cognitive exercises, and environmental toxin avoidance.",
    status: "Ready to download",
    icon: "📚",
  },
  {
    title: "Mini-Course: 5 Rituals of a Sharp Mind",
    description:
      "Simple daily exercises that strengthen new neural connections and accelerate your results with the protocol. Each ritual takes under 5 minutes.",
    status: "Access granted",
    icon: "🧠",
  },
];

function StepCard({ step }: { step: typeof DAILY_PROTOCOL[number] }) {
  const [expanded, setExpanded] = useState(false);
  const time = timeIcon[step.timeOfDay];
  const TimeIconComponent = time.icon;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-start gap-4 text-left"
      >
        {/* Step number */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{step.step}</span>
          </div>
          <div className={cn("p-1 rounded-lg", time.color.split(" ")[1])}>
            <TimeIconComponent className={cn("w-3.5 h-3.5", time.color.split(" ")[0])} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white">{step.title}</h3>
          <p className="text-xs text-surface-400 mt-1 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> {step.timing}
          </p>

          {/* Ingredients preview */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {step.ingredients.map((ing, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full bg-surface-800/60 text-surface-400 border border-surface-700/30"
              >
                {ing.amount} {ing.name.split("(")[0].trim()}
              </span>
            ))}
          </div>
        </div>

        <ChevronDown
          className={cn(
            "w-5 h-5 text-surface-500 transition-transform flex-shrink-0 mt-1",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="px-5 pb-6 border-t border-surface-700/30 pt-5 space-y-6">
          {/* Ingredients with details */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Beaker className="w-4 h-4 text-brand-400" />
              Ingredients
            </h4>
            <div className="space-y-3">
              {step.ingredients.map((ing, i) => (
                <div key={i} className="p-3 rounded-xl bg-surface-800/40 border border-surface-700/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-medium">{ing.name}</span>
                    <span className="text-xs text-brand-400 font-medium">{ing.amount}</span>
                  </div>
                  {ing.note && (
                    <p className="text-[11px] text-surface-500 mt-1 leading-relaxed">{ing.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-400" />
              Step-by-Step Instructions
            </h4>
            <ol className="space-y-2.5">
              {step.instructions.map((instruction, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-surface-300">
                  <span className="w-6 h-6 rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{instruction}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Pro Tips */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Pro Tips
            </h4>
            <div className="space-y-2">
              {step.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/10 border border-amber-900/20">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-surface-400 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Science Note */}
          <div className="p-4 rounded-xl bg-brand-950/20 border border-brand-900/20">
            <h4 className="text-sm font-semibold text-brand-400 mb-2 flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              The Science
            </h4>
            <p className="text-xs text-surface-400 leading-relaxed">{step.scienceNote}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProtocoloPage() {
  // Compile all unique ingredients for shopping list
  const allIngredients = DAILY_PROTOCOL.flatMap((step) =>
    step.ingredients.map((ing) => ({
      name: ing.name.split("(")[0].trim(),
      amount: ing.amount,
      fromStep: step.title,
    }))
  );

  // Deduplicate by name
  const uniqueIngredients = allIngredients.reduce((acc, curr) => {
    const existing = acc.find((item) => item.name === curr.name);
    if (!existing) {
      acc.push(curr);
    }
    return acc;
  }, [] as typeof allIngredients);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">CogniCare Daily Protocol</h1>
          <p className="text-surface-400 mt-1">
            Your complete 5-step daily protocol for cognitive recovery — follow each step at the designated time for optimal results
          </p>
        </div>
      </div>

      {/* Protocol Overview */}
      <div className="glass rounded-2xl p-6 glow-brand">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-gradient-brand">5</p>
            <p className="text-sm text-surface-400 mt-1">Daily Steps</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gradient-brand">45</p>
            <p className="text-sm text-surface-400 mt-1">Minutes / Day</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gradient-brand">56</p>
            <p className="text-sm text-surface-400 mt-1">Day Protocol</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gradient-brand">94%</p>
            <p className="text-sm text-surface-400 mt-1">Recovery Rate</p>
          </div>
        </div>
      </div>

      {/* Daily Steps */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-brand-400" />
          Your 5 Daily Steps
        </h2>
        <p className="text-sm text-surface-400 mb-5">
          Click each step to expand the full instructions, ingredients with exact amounts, pro tips, and the science behind each element.
        </p>
        <div className="space-y-4">
          {DAILY_PROTOCOL.map((step) => (
            <StepCard key={step.step} step={step} />
          ))}
        </div>
      </div>

      {/* Shopping List */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-brand-400" />
          Your Shopping List
        </h2>
        <p className="text-sm text-surface-400 mb-4">
          Everything you need to follow the complete daily protocol. Most items are available at your local health food store or online.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {uniqueIngredients.map((ing, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/40 border border-surface-700/20"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
              <span className="text-sm text-surface-300 flex-1">{ing.name}</span>
              <span className="text-xs text-surface-500">{ing.amount}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bonuses */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-amber-400" />
          Your Exclusive Bonuses
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bonuses.map((bonus) => (
            <div key={bonus.title} className="glass rounded-2xl p-5">
              <span className="text-2xl">{bonus.icon}</span>
              <h3 className="font-semibold text-white text-sm mt-3">
                {bonus.title}
              </h3>
              <p className="text-xs text-surface-400 mt-2 leading-relaxed">{bonus.description}</p>
              <span className="inline-block mt-3 text-[10px] px-2 py-1 rounded-full bg-brand-600/20 text-brand-400">
                {bonus.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Guarantee */}
      <div className="glass rounded-2xl p-6 border-brand-800/30">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-xl bg-brand-600/20 flex-shrink-0">
            <Shield className="w-6 h-6 text-brand-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">
              60-Day Guarantee — 100% Refund
            </h3>
            <p className="text-sm text-surface-400 mt-2 leading-relaxed">
              If within 60 days you do not feel that your mind is clearer, your
              memory sharper, and your sense of identity more present — one email
              is all it takes. We refund every penny. No questions asked, no
              hoops to jump through, no fine print.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
