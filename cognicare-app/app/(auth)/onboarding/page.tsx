"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Brain,
  ArrowRight,
  ArrowLeft,
  Shield,
  Clock,
  CheckCircle2,
  Sparkles,
  ShoppingCart,
  Beaker,
  Target,
} from "lucide-react";

const steps = [
  {
    id: "welcome",
    title: "Welcome to CogniCare Protocol",
    subtitle: "Your 8-week journey to cognitive clarity starts now",
    content: (
      <div className="space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto glow-brand">
          <Brain className="w-10 h-10 text-white" />
        </div>
        <p className="text-surface-300 text-center leading-relaxed max-w-md mx-auto">
          You are about to begin a clinically-informed protocol designed to
          reduce brain fog, restore memory, and rebuild the neural pathways
          affected by everyday cadmium exposure.
        </p>
        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-400">8</p>
            <p className="text-[10px] text-surface-500">Weeks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-400">5</p>
            <p className="text-[10px] text-surface-500">Daily Steps</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-400">45</p>
            <p className="text-[10px] text-surface-500">Min/Day</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "how-it-works",
    title: "How the Protocol Works",
    subtitle: "A science-backed daily routine in 5 simple steps",
    content: (
      <div className="space-y-3 max-w-md mx-auto">
        {[
          { time: "6:30 AM", label: "Morning Cleanse Tonic", desc: "Cadmium chelation with cedar honey", icon: "🍯" },
          { time: "8:00 AM", label: "Bacopa Protocol", desc: "Acetylcholine synthesis support", icon: "🧠" },
          { time: "12:00 PM", label: "Neuroprotective Stack", desc: "Lion's Mane + Magnesium L-Threonate", icon: "🦁" },
          { time: "3:00 PM", label: "Brain Exercise", desc: "Targeted cognitive training + green tea", icon: "🍵" },
          { time: "8:00 PM", label: "Evening Elixir", desc: "Overnight neural repair activation", icon: "🌙" },
        ].map((step, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-3 rounded-xl bg-surface-800/40 border border-surface-700/30"
          >
            <span className="text-2xl">{step.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{step.label}</p>
              <p className="text-[11px] text-surface-400">{step.desc}</p>
            </div>
            <span className="text-[10px] text-surface-500 whitespace-nowrap">{step.time}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "ingredients",
    title: "Gather Your Ingredients",
    subtitle: "Everything you need for Week 1 — most items available at any health store",
    content: (
      <div className="space-y-4 max-w-md mx-auto">
        <div className="glass rounded-xl p-4">
          <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5" /> Essential Ingredients
          </h3>
          <div className="space-y-2">
            {[
              "Cedar Honey (raw, Himalayan) — unprocessed",
              "Bacopa Monnieri extract (50% bacosides, 300mg)",
              "Omega-3 fish oil or algae (1000mg softgels)",
              "Organic turmeric powder",
              "Fresh lemons",
              "Green tea (loose leaf or bags)",
              "Raw walnuts",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-surface-300">
                <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Beaker className="w-3.5 h-3.5" /> Week 3+ (Order Now, Use Later)
          </h3>
          <div className="space-y-2">
            {[
              "Lion's Mane extract (dual-extracted, 500mg)",
              "Magnesium L-Threonate (144mg elemental)",
              "Vitamin D3 (2000 IU)",
              "Black pepper extract (piperine, 5mg)",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-surface-400">
                <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "ready",
    title: "You Are Ready",
    subtitle: "Your Week 1 protocol begins today",
    content: (
      <div className="space-y-6 max-w-md mx-auto text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto glow-brand">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-3">
          <p className="text-surface-300 leading-relaxed">
            Your dashboard is personalized for Week 1. Each day, you will see
            exactly what to do and when to do it. The protocol adapts as you progress.
          </p>
          <div className="glass rounded-xl p-4 text-left space-y-2">
            <h4 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-brand-400" /> Your first 3 actions
            </h4>
            <div className="flex items-center gap-2 text-sm text-surface-300">
              <span className="w-5 h-5 rounded-full bg-brand-600/30 text-brand-400 flex items-center justify-center text-[10px] font-bold">1</span>
              Prepare your Morning Cleanse Tonic tomorrow at 6:30 AM
            </div>
            <div className="flex items-center gap-2 text-sm text-surface-300">
              <span className="w-5 h-5 rounded-full bg-brand-600/30 text-brand-400 flex items-center justify-center text-[10px] font-bold">2</span>
              Record your baseline brain fog level (1–10) tonight
            </div>
            <div className="flex items-center gap-2 text-sm text-surface-300">
              <span className="w-5 h-5 rounded-full bg-brand-600/30 text-brand-400 flex items-center justify-center text-[10px] font-bold">3</span>
              Check your Daily Protocol page for full instructions
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-surface-500">
          <Shield className="w-3.5 h-3.5" />
          60-day guarantee — 100% refund, no questions asked
        </div>
      </div>
    ),
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  const completeOnboarding = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_complete: true })
        .eq("id", user.id);
    }
  };

  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;
  const step = steps[currentStep];

  const goNext = async () => {
    if (isLast) {
      await completeOnboarding();
      router.push("/dashboard");
      router.refresh();
      return;
    }
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
      setAnimating(false);
    }, 200);
  };

  const goBack = () => {
    if (isFirst) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep((prev) => prev - 1);
      setAnimating(false);
    }, 200);
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-600/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-brand-600/5 rounded-full blur-3xl" />

      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === currentStep
                  ? "w-8 bg-brand-500"
                  : i < currentStep
                  ? "w-4 bg-brand-600/50"
                  : "w-4 bg-surface-700"
              )}
            />
          ))}
        </div>

        {/* Card */}
        <div
          className={cn(
            "glass rounded-2xl p-8 transition-all duration-200",
            animating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          )}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-white">{step.title}</h1>
            <p className="text-surface-400 text-sm mt-1">{step.subtitle}</p>
          </div>

          {/* Content */}
          {step.content}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            {!isFirst ? (
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-surface-400 hover:text-surface-200 text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={goNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-medium hover:from-brand-500 hover:to-brand-400 transition-all"
            >
              {isLast ? "Start My Protocol" : "Continue"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={async () => {
              await completeOnboarding();
              router.push("/dashboard");
              router.refresh();
            }}
            className="block mx-auto mt-4 text-xs text-surface-600 hover:text-surface-400 transition-colors"
          >
            Skip introduction
          </button>
        )}
      </div>
    </div>
  );
}
