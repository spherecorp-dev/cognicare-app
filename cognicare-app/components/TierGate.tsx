"use client";

import { useUser } from "@/components/providers/UserProvider";
import Link from "next/link";
import { Lock, ArrowRight, Shield, Sparkles, Zap, Users, Crown } from "lucide-react";

const tierInfo: Record<string, { name: string; price: string; icon: React.ElementType; color: string; benefits: string[] }> = {
  accelerator: {
    name: "Neural Accelerator",
    price: "$47",
    icon: Zap,
    color: "amber",
    benefits: [
      "3 acceleration compounds that cut recovery time from 90 to 21 days",
      "Advanced Preparation Guide (PDF)",
      "21 Activation Recipes",
      "8-Week Reconnection Map",
    ],
  },
  family: {
    name: "Family Protocol",
    price: "$97",
    icon: Users,
    color: "blue",
    benefits: [
      "Protect up to 3 family members",
      "Preventive Shield Protocol",
      "5 Foods That Accumulate Most Cadmium guide",
      "Family Conversation Manual",
    ],
  },
  circle: {
    name: "Family Protection Circle",
    price: "$37/mo",
    icon: Crown,
    color: "purple",
    benefits: [
      "Exclusive video lesson modules",
      "Monthly optimization reports",
      "47-Point Home Audit checklist",
      "Science Library premium articles",
      "Weekly content updates",
    ],
  },
};

export function TierGate({ tier, children }: { tier: string; children: React.ReactNode }) {
  const { profile } = useUser();
  const hasTier = (profile.purchased_tiers || ["protocol"]).includes(tier);

  if (hasTier) return <>{children}</>;

  const info = tierInfo[tier];
  if (!info) return <>{children}</>;

  const Icon = info.icon;

  return (
    <div className="space-y-8">
      {/* Lock Banner */}
      <div className="glass rounded-2xl p-8 text-center border-surface-700/50">
        <div className={`w-16 h-16 rounded-2xl bg-${info.color}-600/20 flex items-center justify-center mx-auto mb-4`}>
          <Lock className={`w-8 h-8 text-${info.color}-400`} />
        </div>
        <h1 className="text-2xl font-bold text-white">{info.name}</h1>
        <p className="text-surface-400 mt-2 max-w-md mx-auto">
          Unlock this content to accelerate your cognitive recovery journey
        </p>
        <div className="mt-4">
          <span className={`text-3xl font-bold text-${info.color}-400`}>{info.price}</span>
          {tier === "circle" && <span className="text-surface-500 text-sm ml-1">per month</span>}
        </div>
      </div>

      {/* Benefits */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className={`w-5 h-5 text-${info.color}-400`} />
          What You Get
        </h2>
        <div className="space-y-3">
          {info.benefits.map((benefit, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface-800/40">
              <Shield className={`w-4 h-4 text-${info.color}-400 flex-shrink-0 mt-0.5`} />
              <span className="text-sm text-surface-300">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Guarantee */}
      <div className="glass rounded-2xl p-6 text-center">
        <Shield className="w-6 h-6 text-brand-400 mx-auto mb-2" />
        <p className="text-sm text-surface-300">60-day money-back guarantee — 100% refund, no questions asked</p>
      </div>
    </div>
  );
}
