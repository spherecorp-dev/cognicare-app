"use client";

import { TierGate } from "@/components/TierGate";
import { cn } from "@/lib/utils";
import {
  Users,
  Heart,
  Shield,
  FileText,
  UserPlus,
  Apple,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const included = [
  {
    icon: UserPlus,
    title: "Family License — 3 People",
    description:
      "The same complete CogniCare protocol you purchased — now authorized for 3 additional family members. Send the PDF immediately to whoever you choose. Each person gets their own progress tracker and personalized dosage recommendations based on age and symptom profile.",
  },
  {
    icon: Shield,
    title: "Preventive Shield Protocol",
    description:
      "For family members who do not yet show symptoms. This maintenance-dose version uses lower concentrations and a different frequency schedule — designed to keep cadmium levels under control and sustain healthy acetylcholine production before damage occurs. Prevention is 10x more effective than reversal.",
  },
  {
    icon: Apple,
    title: "Guide: The 5 Foods That Accumulate the Most Cadmium",
    description:
      "Dr. Gupta mentioned that item #3 on this list is in most family refrigerators right now. Discover all 5 — and the practical substitutions you can make this week. Includes a printable kitchen checklist your family can reference during grocery shopping.",
  },
  {
    icon: MessageCircle,
    title: "Family Conversation Manual",
    description:
      'The hardest part is not the protocol — it is the conversation. This guide shows you how to present the discovery without sounding alarmist, how to address skepticism with data, and how to generate genuine buy-in from family members who might initially resist. Includes word-for-word scripts for the most common objections.',
  },
];

export default function FamiliaPage() {
  return (
    <TierGate tier="family">
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">CogniCare Family Protocol</h1>
          <p className="text-surface-400 mt-1">
            Protect up to 3 family members with the preventive protocol
          </p>
        </div>
      </div>

      {/* Alert Box */}
      <div className="glass rounded-2xl p-5 border-amber-900/30 bg-amber-950/10">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-400">
              Why prevention is urgent
            </h3>
            <p className="text-xs text-surface-400 mt-1 leading-relaxed">
              &ldquo;Cadmium chloride exposure is not individual. It is household-level.
              It is generational. The difference between someone who already shows
              symptoms and someone who does not is essentially the duration of
              accumulation — and age. Every year of delay in prevention narrows
              the window for full cognitive protection.&rdquo;
              <span className="text-surface-500 block mt-1">— Dr. Paul Cox</span>
            </p>
          </div>
        </div>
      </div>

      {/* Family Access */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <Heart className="w-5 h-5 text-blue-400" />
          Family Access
        </h2>
        <p className="text-sm text-surface-400 mb-5">
          Share the protocol PDF and shopping lists directly with your family members
        </p>

        <div className="space-y-3">
          {[1, 2, 3].map((num) => (
            <div
              key={num}
              className="flex items-center gap-4 p-4 rounded-xl bg-surface-800/40 border border-surface-700/30"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-surface-300">Family Member {num}</p>
                <p className="text-xs text-surface-500">
                  Share the protocol PDF and shopping lists directly with your family member
                </p>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-brand-600/20 text-brand-400 text-xs font-medium">
                Access Granted
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* What's Included */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-blue-400" />
          What&apos;s Included
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {included.map((item) => (
            <div key={item.title} className="glass rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-600/20 flex-shrink-0">
                  <item.icon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                  <p className="text-xs text-surface-400 mt-2 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 text-xs hover:bg-blue-600/30 transition-colors">
                      <FileText className="w-3.5 h-3.5" /> Read Content
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emotional CTA */}
      <div className="glass rounded-2xl p-6 glow-brand">
        <blockquote className="text-surface-300 text-sm italic leading-relaxed">
          &ldquo;Imagine that 10 years from now, one of your children goes through the
          same thing. And one day they ask you: &apos;Did you know this could have been
          prevented?&apos; — You knew. From this moment forward, you know. The question
          is no longer whether you have the information. It is what you choose to
          do with it.&rdquo;
        </blockquote>
      </div>
    </div>
    </TierGate>
  );
}
