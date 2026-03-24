"use client";

import { useState } from "react";
import { TierGate } from "@/components/TierGate";
import { cn } from "@/lib/utils";
import {
  Zap,
  BookOpen,
  ChefHat,
  Map,
  FileText,
  ArrowRight,
  CheckCircle2,
  Timer,
  ChevronDown,
  X,
} from "lucide-react";
import Link from "next/link";

const included = [
  {
    id: "prep-guide",
    icon: BookOpen,
    title: "Advanced Preparation Guide",
    description:
      "The exact protocol for combining the 3 accelerator compounds with the core CogniCare protocol at the optimal times. Includes the best timing windows tested by Dr. Cox — morning, afternoon, or evening — depending on your symptom pattern and circadian rhythm.",
    type: "Guide",
    content: [
      { heading: "Optimal Timing Windows", body: "The accelerator compounds work best when taken during specific metabolic windows. Morning (6-8 AM): Himalayan Compound — your cortisol awakening response enhances absorption by 340%. Take with warm water on an empty stomach, 30 minutes before breakfast. Afternoon (1-3 PM): Monastic Compound — the post-prandial dip creates an ideal environment for synaptic potentiation. Take with a small fat source (olive oil, avocado). Evening (7-9 PM): Amazonian Compound — BDNF production peaks during the transition to sleep. Take 2 hours before bed with cedar honey." },
      { heading: "Combining with Core Protocol", body: "The 3 compounds amplify the core CogniCare protocol through complementary mechanisms. Week 1-2: Start with the Himalayan Compound only at half dose. This allows your system to upregulate the receptor sites. Week 3-4: Add the Monastic Compound. The myelin regeneration from the Himalayan Compound creates the substrate for synaptic potentiation. Week 5+: Add the Amazonian Compound. By now, your neural pathways are primed for BDNF-driven neurogenesis." },
      { heading: "Dosage Adjustments", body: "Body weight under 150 lbs: Use 75% of standard dose. Body weight 150-200 lbs: Standard dose. Body weight over 200 lbs: Use 125% of standard dose. If you experience vivid dreams (common in Week 2-3), reduce the evening Amazonian Compound by 25%. This is actually a sign of increased neuroplasticity — your brain is consolidating new neural patterns during REM sleep." },
      { heading: "Signs It's Working", body: "Day 3-5: Subtle improvement in morning clarity. Day 7-11: Noticeable reduction in word-finding difficulty. Day 14-18: Improved ability to hold complex thoughts. Day 21+: Significant improvement in short-term memory recall. These timelines are based on Dr. Cox's clinical observations across 847 participants." },
    ],
  },
  {
    id: "recipe-book",
    icon: ChefHat,
    title: "Activation Recipe Book — 21 Preparations",
    description:
      "Each recipe incorporates the accelerator compounds into everyday foods. No extra supplements needed. Everything uses grocery store ingredients, prepared in under 5 minutes. Organized by time of day and cognitive target.",
    type: "Recipes",
    content: [
      { heading: "Morning Preparations (7 Recipes)", body: "1. Golden Brain Elixir — Warm water + turmeric + black pepper + Himalayan Compound + raw honey. Activates curcumin absorption by 2000% with piperine.\n2. Neuro-Berry Smoothie — Blueberries + spinach + flaxseed + coconut oil + compound. Rich in anthocyanins for cerebrovascular health.\n3. Clarity Oatmeal — Steel-cut oats + walnuts + cinnamon + compound stirred in after cooking. Sustained glucose release for morning focus.\n4. Focus Matcha Bowl — Matcha + almond milk + compound + banana. L-theanine synergizes with the Himalayan Compound.\n5. Memory Muffin Mix — Almond flour + eggs + blueberries + compound baked at low heat (325°F). Preserves compound bioactivity.\n6. Synaptic Sunrise Juice — Beet + carrot + ginger + lemon + compound. Nitric oxide boost enhances cerebral blood flow.\n7. Neural Overnight Oats — Oats + chia seeds + compound + yogurt. Prepared night before for zero-effort mornings." },
      { heading: "Afternoon Preparations (7 Recipes)", body: "8. Brain Fog Buster Soup — Bone broth + lion's mane mushroom powder + Monastic Compound. Glycine + NGF stimulation.\n9. Reconnection Salad Dressing — Olive oil + lemon + garlic + compound. Fat-soluble delivery maximizes afternoon absorption.\n10. Focus Trail Mix — Walnuts + dark chocolate chips + pumpkin seeds + compound powder. Omega-3s + magnesium + theobromine.\n11. Clarity Guacamole — Avocado + lime + cilantro + compound. Monounsaturated fats enhance compound transport across BBB.\n12. Neural Tea Blend — Green tea + rosemary + compound dissolved. EGCG potentiates synaptic compound effects.\n13. Memory Hummus — Chickpeas + tahini + turmeric + compound. B-vitamins support methylation pathways.\n14. Synaptic Smoothie Bowl — Açaí + banana + almond butter + compound. Anthocyanins + healthy fats for sustained delivery." },
      { heading: "Evening Preparations (7 Recipes)", body: "15. Dream State Elixir — Warm milk (or almond milk) + cedar honey + Amazonian Compound + nutmeg. Tryptophan pathway activation.\n16. Restoration Soup — Sweet potato + coconut milk + turmeric + compound. Anti-inflammatory + BDNF stimulation before sleep.\n17. Neural Night Chocolate — Dark chocolate (85%+) melted + compound + sea salt. Flavanols enhance evening neuroplasticity.\n18. Sleep Architecture Pudding — Chia seeds + compound + tart cherry juice. Melatonin precursors + BDNF compound.\n19. Recovery Bone Broth — Slow-simmered bones + garlic + compound added after cooling to 140°F. Glycine for neural repair during sleep.\n20. Neurogenesis Night Cap — Chamomile tea + honey + compound. Apigenin + BDNF compound synergy.\n21. Weekend Deep Reset — All 3 compounds combined in a single preparation with coconut oil + cacao + honey. Use only once per week for intensive neural repair." },
    ],
  },
  {
    id: "reconnection-map",
    icon: Map,
    title: "8-Week Reconnection Map",
    description:
      'Visual week-by-week calendar: what to expect, signs of real progress, and what is normal vs. what requires adjustment. Eliminates the anxiety of "is this working?" — you will know exactly where you should be at every stage.',
    type: "Map",
    content: [
      { heading: "Week 1-2: Foundation Phase", body: "What to expect: Subtle shifts in morning clarity. You may notice you're reaching for words less often. Sleep may become slightly deeper. Some people report more vivid dreams — this is normal and indicates increased neuroplasticity during REM.\n\nSigns of progress: Waking up feeling 10-15% more alert. Slight improvement in reading comprehension. Less afternoon brain fog.\n\nWhat's normal: Mild headache in the first 3 days (detox response). Slight changes in appetite. Increased thirst.\n\nAction items: Start Himalayan Compound only. Track brain fog on 1-10 scale daily. Complete Week 1-2 protocol tasks." },
      { heading: "Week 3-4: Acceleration Phase", body: "What to expect: This is where the accelerator earns its name. Synaptic reconnection accelerates as the Monastic Compound amplifies the foundation laid in Weeks 1-2. Most participants report their 'aha moment' during this phase.\n\nSigns of progress: Noticeably fewer word-finding difficulties. Improved ability to follow conversations in noisy environments. Better recall of recent events. Less reliance on lists and reminders.\n\nWhat's normal: Occasional 'foggy day' — neural reorganization isn't linear. Temporary increase in dream intensity. Mild mood fluctuations as neurotransmitter balance shifts.\n\nAction items: Add Monastic Compound. Increase recipe variety. Continue daily tracking." },
      { heading: "Week 5-6: Integration Phase", body: "What to expect: The three compounds are now working synergistically. BDNF production from the Amazonian Compound drives neurogenesis while the other two compounds maintain and strengthen existing repairs.\n\nSigns of progress: Sustained focus for 2+ hours without mental fatigue. Significant improvement in short-term memory. Better emotional regulation. Improved spatial navigation (less getting lost or forgetting why you entered a room).\n\nWhat's normal: A brief 'plateau' around day 35-38 is common. Your brain is consolidating gains. The plateau breaks within 3-5 days.\n\nAction items: Add Amazonian Compound. Try the Weekend Deep Reset recipe. Begin cognitive assessments to track measurable improvement." },
      { heading: "Week 7-8: Optimization Phase", body: "What to expect: By now, the neural repair process is well-established and self-sustaining. The compounds continue to optimize, but your brain's own repair mechanisms are now significantly enhanced.\n\nSigns of progress: Cognitive function approaching or exceeding pre-decline levels. Consistent mental clarity throughout the day. Improved processing speed. Better working memory capacity.\n\nMaintenance plan: After Week 8, reduce to maintenance dosing (50% of active phase). Continue 3 key recipes daily. Monthly cognitive assessment to track long-term trajectory.\n\nCelebration milestones: Compare your Week 1 brain fog score to Week 8. Most participants see a 60-80% improvement." },
    ],
  },
];

const stats = [
  { value: "11", unit: "days", label: "Average time to notice difference", sub: "vs. 34 days without accelerator" },
  { value: "71%", unit: "", label: "Brain fog eliminated", sub: "Within 21 days" },
  { value: "38%", unit: "", label: "Higher cognitive scores", sub: "At 60 days vs. control group" },
  { value: "4-5x", unit: "", label: "Faster results", sub: "Synaptic reconstruction rate" },
];

const compounds = [
  {
    name: "Himalayan Compound",
    origin: "Village in rural Japan",
    effect: "Accelerates myelin sheath regeneration — the insulation around your neural wiring",
  },
  {
    name: "Monastic Compound",
    origin: "Tibetan monasteries, Nepal",
    effect: "Potentiates synaptic reconnection — strengthens new neural pathway formation",
  },
  {
    name: "Amazonian Compound",
    origin: "Brazilian Amazon rainforest",
    effect: "Stimulates BDNF production — the protein that grows and protects neurons",
  },
];

export default function AceleradorPage() {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  return (
    <TierGate tier="accelerator">
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">CogniCare Neural Accelerator</h1>
          <p className="text-surface-400 mt-1">
            Shorten your time to results from 90 days to 21 days with the 3 synaptic acceleration compounds
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-5 text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-bold text-gradient-gold">{stat.value}</span>
              {stat.unit && <span className="text-sm text-amber-400">{stat.unit}</span>}
            </div>
            <p className="text-xs text-white mt-2 font-medium">{stat.label}</p>
            <p className="text-[10px] text-surface-500 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* The 3 Compounds */}
      <div className="glass rounded-2xl p-6 glow-gold">
        <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <Timer className="w-5 h-5 text-amber-400" />
          The 3 Acceleration Compounds
        </h2>
        <p className="text-sm text-surface-400 mb-5">
          Discovered in 3 communities with near-zero dementia rates — isolated and tested over 18 months by Dr. Cox&apos;s research team
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {compounds.map((c, i) => (
            <div
              key={c.name}
              className="bg-surface-800/50 rounded-xl p-4 border border-amber-900/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <h3 className="text-sm font-semibold text-white">{c.name}</h3>
              </div>
              <p className="text-xs text-surface-400">
                <span className="text-surface-500">Origin:</span> {c.origin}
              </p>
              <p className="text-xs text-amber-400/80 mt-1.5 leading-relaxed">{c.effect}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What's Included */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-amber-400" />
          What&apos;s Included
        </h2>

        <div className="space-y-4">
          {included.map((item) => {
            const isExpanded = expandedItem === item.id;
            return (
            <div key={item.id} className="glass rounded-2xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-amber-600/20 flex-shrink-0">
                    <item.icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-600/20 text-amber-400">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs text-surface-400 mt-2 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 text-amber-400 text-xs hover:bg-amber-600/30 transition-colors"
                      >
                        {isExpanded ? (
                          <><X className="w-3.5 h-3.5" /> Close</>
                        ) : (
                          <><FileText className="w-3.5 h-3.5" /> Read Online</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-surface-700/30 p-5 space-y-5 bg-surface-900/30">
                  {item.content.map((section, i) => (
                    <div key={i}>
                      <h4 className="text-sm font-semibold text-amber-400 mb-2">{section.heading}</h4>
                      <p className="text-xs text-surface-300 leading-relaxed whitespace-pre-line">{section.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>

      {/* CTA to Recipes */}
      <Link
        href="/receitas"
        className="glass rounded-2xl p-5 flex items-center gap-4 hover:border-amber-800/40 transition-all group block"
      >
        <div className="p-2.5 rounded-xl bg-amber-600/20">
          <ChefHat className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white text-sm">
            View Activation Recipes
          </h3>
          <p className="text-xs text-surface-400">
            8 preparations ready with grocery store ingredients in under 10 minutes
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-surface-600 group-hover:text-amber-400 transition-colors" />
      </Link>

      {/* Clinical Quote */}
      <div className="glass rounded-2xl p-6">
        <blockquote className="text-surface-300 text-sm italic leading-relaxed">
          &ldquo;When we added the Accelerator compounds, it was as if someone had simply
          pressed the fast-forward button on neural recovery. The synaptic reconnection
          rate increased dramatically — patients were hitting their 90-day benchmarks
          in just 3 weeks.&rdquo;
        </blockquote>
        <p className="text-xs text-surface-500 mt-3">
          — Dr. Roman, clinical trial supervisor
        </p>
      </div>
    </div>
    </TierGate>
  );
}
