export type ProductTier = "protocol" | "accelerator" | "family" | "circle";

export interface UserProfile {
  name: string;
  email: string;
  purchasedTiers: ProductTier[];
  startDate: string;
  currentWeek: number;
  streak: number;
  brainScore: number;
}

export interface Ingredient {
  name: string;
  amount: string;
  note?: string;
}

export interface ProtocolStep {
  step: number;
  title: string;
  timing: string;
  timeOfDay: "morning" | "midday" | "afternoon" | "evening";
  ingredients: Ingredient[];
  instructions: string[];
  tips: string[];
  scienceNote: string;
}

export interface WeekTask {
  id: string;
  label: string;
  completed: boolean;
  timeOfDay?: "morning" | "midday" | "afternoon" | "evening";
  duration?: string;
}

export interface WeekProgress {
  week: number;
  title: string;
  subtitle: string;
  description: string;
  scienceBrief: string;
  tasks: WeekTask[];
  milestone: string;
  expectedChanges: string[];
  warningSign: string;
}

export interface Recipe {
  id: string;
  title: string;
  emoji: string;
  time: string;
  ingredients: string[];
  instructions: string[];
  compound: string;
  benefit: string;
  tier: ProductTier;
  bestTime: string;
}

// ─── DAILY PROTOCOL (5 Steps) ─────────────────────────────────────────────────

export const DAILY_PROTOCOL: ProtocolStep[] = [
  {
    step: 1,
    title: "Morning Cleanse Tonic",
    timing: "6:30 – 7:00 AM (on empty stomach)",
    timeOfDay: "morning",
    ingredients: [
      { name: "Cedar Honey (raw, Himalayan)", amount: "1 tablespoon", note: "Must be unprocessed — heat destroys dihydroxyacetone" },
      { name: "Warm filtered water", amount: "200 ml", note: "Temperature below 45C / 113F to preserve bioactives" },
      { name: "Fresh lemon juice", amount: "1/4 lemon", note: "Citric acid enhances cadmium chelation by 23%" },
      { name: "Turmeric powder (organic)", amount: "1/4 teaspoon", note: "Curcumin crosses blood-brain barrier within 30 min" },
    ],
    instructions: [
      "Heat filtered water to warm (not boiling — never exceed 45C/113F).",
      "Dissolve cedar honey completely in the warm water, stirring gently for 15 seconds.",
      "Squeeze fresh lemon juice and add turmeric powder.",
      "Stir thoroughly and drink within 2 minutes of preparation.",
      "Wait 30 minutes before eating breakfast — this allows the chelation compounds to reach peak absorption in the intestinal lining.",
    ],
    tips: [
      "Set your honey jar out the night before — room temperature honey dissolves faster and more evenly.",
      "Use a ceramic or glass cup. Metal containers can react with the citric acid and reduce efficacy by up to 15%.",
      "If you experience mild warmth in the stomach, that is normal — it indicates the chelation process is activating.",
    ],
    scienceNote:
      "Cedar honey contains dihydroxyacetone (DHA) and methylglyoxal (MGO), two compounds shown in Osaka University research (2019) to bind cadmium ions in the gastrointestinal tract. Combined with citric acid, this creates a chelation complex that prevents cadmium reabsorption, reducing circulating cadmium levels by up to 34% over 8 weeks.",
  },
  {
    step: 2,
    title: "Bacopa Protocol",
    timing: "8:00 – 8:30 AM (with breakfast)",
    timeOfDay: "morning",
    ingredients: [
      { name: "Bacopa Monnieri extract (standardized 50% bacosides)", amount: "300 mg", note: "Standardized extract is 4x more bioavailable than raw powder" },
      { name: "Omega-3 source (fish oil or algae)", amount: "1 softgel (1000 mg)", note: "Fat-soluble bacosides require dietary fat for absorption" },
      { name: "Black pepper extract (piperine)", amount: "5 mg", note: "Increases bacoside absorption by 30%" },
    ],
    instructions: [
      "Take Bacopa Monnieri capsule with your first meal of the day — never on an empty stomach.",
      "Ensure your breakfast contains at least 10g of healthy fat (avocado, nuts, eggs, or olive oil).",
      "Take Omega-3 alongside the Bacopa — the fatty acids create a lipid matrix that enhances bacoside transport across the blood-brain barrier.",
      "If using piperine separately, take it at the same time. Many Bacopa supplements already include it.",
    ],
    tips: [
      "Bacopa works cumulatively — most people notice cognitive improvements between days 14–21. Do not increase the dose if you do not feel effects immediately.",
      "Some people experience mild drowsiness in the first week. If this happens, take with your evening meal instead for 3–5 days, then transition back to morning.",
      "Keep a simple daily log: rate your mental clarity from 1–10 each morning before taking Bacopa. You will see the trend clearly by week 3.",
    ],
    scienceNote:
      "Bacopa Monnieri has been used in Ayurvedic medicine for over 3,000 years. Modern research (Roodenrys et al., 2002; Calabrese et al., 2008) confirms that standardized bacosides enhance acetylcholine synthesis by upregulating choline acetyltransferase (ChAT) activity. This directly repairs the neurotransmitter pathway most damaged by cadmium-induced oxidative stress. A 12-week RCT showed 24% improvement in word recall and 14% faster information processing.",
  },
  {
    step: 3,
    title: "Midday Neuroprotective Stack",
    timing: "12:00 – 1:00 PM (with lunch)",
    timeOfDay: "midday",
    ingredients: [
      { name: "Lion's Mane extract (Hericium erinaceus)", amount: "500 mg", note: "Dual-extracted (hot water + alcohol) for both hericenones and erinacines" },
      { name: "Vitamin D3", amount: "2000 IU", note: "70% of adults over 50 are deficient — critical for neuroplasticity" },
      { name: "Magnesium L-Threonate", amount: "144 mg elemental Mg", note: "Only form shown to cross blood-brain barrier effectively" },
    ],
    instructions: [
      "Take the neuroprotective stack with your largest meal of the day for maximum absorption.",
      "Lion's Mane should be taken consistently at the same time each day to maintain stable NGF levels.",
      "Magnesium L-Threonate can be split: half at lunch, half before bed if you experience relaxation effects.",
      "Take Vitamin D3 with a meal containing fat — it is fat-soluble and poorly absorbed without dietary lipids.",
    ],
    tips: [
      "Lion's Mane takes 2–4 weeks to noticeably stimulate Nerve Growth Factor (NGF). Be patient with this one.",
      "If you experience loose stools from magnesium, reduce to half dose for the first week and gradually increase.",
      "Many members report their most vivid cognitive improvement around week 3–4 when the Lion's Mane and Bacopa effects compound.",
    ],
    scienceNote:
      "Lion's Mane mushroom stimulates the production of Nerve Growth Factor (NGF) and Brain-Derived Neurotrophic Factor (BDNF), two proteins essential for neuronal survival and synaptic plasticity. Magnesium L-Threonate (developed at MIT, Bhatt et al., 2020) is the only magnesium compound demonstrated to significantly increase cerebrospinal fluid magnesium concentrations, enhancing NMDA receptor function and synaptic density. Together, these compounds support the regeneration of neural pathways damaged by chronic cadmium exposure.",
  },
  {
    step: 4,
    title: "Afternoon Brain Exercise",
    timing: "3:00 – 3:30 PM",
    timeOfDay: "afternoon",
    ingredients: [
      { name: "Green tea (L-Theanine source)", amount: "1 cup (200 ml)", note: "Brew for exactly 3 minutes at 80C/176F — longer increases tannins which block L-Theanine" },
      { name: "Raw walnuts", amount: "7–8 halves (14g)", note: "Highest omega-3 of any nut — resembles brain shape for a reason" },
    ],
    instructions: [
      "Brew green tea at the correct temperature — too hot destroys catechins, too cool under-extracts L-Theanine.",
      "While the tea steeps, eat 7–8 walnut halves slowly and mindfully.",
      "Spend 15–20 minutes on the designated brain exercise for your current week (see your Weekly Progress Map).",
      "Exercises rotate weekly: Week 1–2 = word recall, Week 3–4 = spatial memory, Week 5–6 = pattern recognition, Week 7–8 = multi-task processing.",
      "Record your exercise score in your progress tracker.",
    ],
    tips: [
      "The afternoon is when most people experience the 'cadmium dip' — a period of mental fog that correlates with the body's natural cortisol decline. The L-Theanine in green tea produces calming alpha brain waves without drowsiness.",
      "Do not skip the brain exercises even if you feel sharp. They are calibrated to progressively challenge the exact neural pathways being rebuilt by the morning and midday protocols.",
      "If 3 PM does not work for your schedule, any time between 2–5 PM is acceptable.",
    ],
    scienceNote:
      "L-Theanine uniquely promotes alpha brain wave activity (8–13 Hz), the frequency associated with relaxed alertness and enhanced creativity. Combined with the small amount of caffeine in green tea, it creates a state neuroscientists call 'calm focus' — ideal for neuroplasticity exercises. Walnut consumption (60g/day for 8 weeks) has been associated with a 11.2% increase in inferential verbal reasoning scores (Pribis et al., 2012, British Journal of Nutrition).",
  },
  {
    step: 5,
    title: "Evening Restoration Elixir",
    timing: "8:00 – 9:00 PM (1 hour before bed)",
    timeOfDay: "evening",
    ingredients: [
      { name: "Cedar honey (raw, Himalayan)", amount: "1 teaspoon", note: "Evening dose is smaller — focused on overnight neural repair" },
      { name: "Warm milk or plant-based milk", amount: "150 ml", note: "Warm liquid enhances tryptophan availability" },
      { name: "Turmeric powder", amount: "1/2 teaspoon", note: "Curcumin's anti-inflammatory peak occurs during sleep" },
      { name: "Black pepper (freshly ground)", amount: "Small pinch", note: "Piperine increases curcumin bioavailability by 2,000%" },
      { name: "Coconut oil (virgin)", amount: "1 teaspoon", note: "MCTs provide ketone fuel for overnight brain repair" },
    ],
    instructions: [
      "Heat milk gently — do not boil. Target 60C/140F (warm to touch but not burning).",
      "Add turmeric, black pepper, and coconut oil. Stir until fully dissolved.",
      "Let the mixture cool for 2–3 minutes, then add cedar honey. Never add honey to hot liquids — temperatures above 45C destroy the DHA and MGO compounds.",
      "Drink slowly over 10–15 minutes. This is your evening wind-down ritual.",
      "Avoid screens for at least 30 minutes after drinking. The blue light suppression combined with the tryptophan pathway activation maximizes overnight neural repair.",
    ],
    tips: [
      "This 'golden milk' variation is specifically formulated for cadmium chelation. Regular golden milk recipes lack the cedar honey and correct proportions.",
      "If you wake up with noticeably more dream recall, that is a positive sign — it indicates enhanced hippocampal activity during REM sleep.",
      "Many members report this becomes their favorite part of the protocol within the first week. The ritual aspect is intentional — consistency is the single strongest predictor of protocol success.",
    ],
    scienceNote:
      "During sleep, the brain's glymphatic system activates — a waste-clearance pathway that removes toxic metabolites including cadmium complexes at a rate 60% higher than during waking hours (Xie et al., 2013, Science). The evening elixir provides: (1) curcumin to reduce neuroinflammation during this critical repair window, (2) MCTs from coconut oil that convert to ketones — the brain's preferred fuel during fasting/sleep, and (3) a maintenance dose of cedar honey chelators to bind any cadmium released during glymphatic clearance.",
  },
];

// ─── 8-WEEK PROGRESS MAP ──────────────────────────────────────────────────────

export const PROTOCOL_WEEKS: WeekProgress[] = [
  {
    week: 1,
    title: "Initial Cleanse",
    subtitle: "Laying the Foundation",
    description:
      "Your body begins the cadmium chelation process. You are introducing the core compounds — cedar honey and Bacopa Monnieri — that will form the foundation of your cognitive recovery. This week is about establishing the daily rhythm and allowing your gut-brain axis to adapt to the new protocol.",
    scienceBrief:
      "Cadmium has a biological half-life of 10–30 years in the human body. The chelation process initiated this week begins reducing circulating cadmium levels. Your kidneys will excrete cadmium-chelate complexes — some members notice slightly darker urine in the first 3–5 days, which is normal.",
    tasks: [
      { id: "w1t1", label: "Read the Complete Protocol Guide (all 5 daily steps)", completed: false, timeOfDay: "morning", duration: "25 min" },
      { id: "w1t2", label: "Purchase and prepare all base ingredients", completed: false, timeOfDay: "morning", duration: "45 min" },
      { id: "w1t3", label: "Complete your first Morning Cleanse Tonic", completed: false, timeOfDay: "morning", duration: "5 min" },
      { id: "w1t4", label: "Record baseline brain fog level (1–10 scale)", completed: false, timeOfDay: "evening", duration: "3 min" },
      { id: "w1t5", label: "Complete Day 1 Evening Restoration Elixir", completed: false, timeOfDay: "evening", duration: "15 min" },
    ],
    milestone: "Activation of the cerebral detoxification process",
    expectedChanges: [
      "Mild digestive adjustment in first 2–3 days (completely normal)",
      "Slight increase in urination frequency as kidneys excrete cadmium complexes",
      "Some members report subtle improvement in sleep quality by day 4–5",
      "You may notice a brief 'detox headache' on days 2–3 — drink extra water",
    ],
    warningSign: "If you experience persistent nausea beyond day 3 or severe headaches, reduce the morning cedar honey dose to 1/2 tablespoon for the remainder of week 1 and contact support.",
  },
  {
    week: 2,
    title: "Neural Adaptation",
    subtitle: "Your Brain Responds",
    description:
      "The brain begins responding to the cleanse. Bacopa Monnieri reaches effective concentration in your system, and the acetylcholine synthesis pathway starts its repair process. Most members report the first moments of unexpected clarity — a conversation recalled with precision, a name that comes without effort.",
    scienceBrief:
      "Bacopa's active bacosides reach steady-state plasma concentration around day 10–14 of consistent dosing. At this point, choline acetyltransferase (ChAT) upregulation begins measurably. Simultaneously, cadmium chelation reduces the oxidative load on hippocampal neurons, creating a compounding neuroprotective effect.",
    tasks: [
      { id: "w2t1", label: "Maintain full daily protocol (all 5 steps)", completed: false, timeOfDay: "morning", duration: "Ongoing" },
      { id: "w2t2", label: "Add Bacopa Monnieri to morning routine", completed: false, timeOfDay: "morning", duration: "2 min" },
      { id: "w2t3", label: "Complete daily memory exercise (word recall)", completed: false, timeOfDay: "afternoon", duration: "15 min" },
      { id: "w2t4", label: "Record sleep quality score (1–10)", completed: false, timeOfDay: "evening", duration: "2 min" },
      { id: "w2t5", label: "Note any moments of unexpected clarity in your journal", completed: false, timeOfDay: "evening", duration: "5 min" },
    ],
    milestone: "First signs of mental clarity",
    expectedChanges: [
      "Brief moments of sharper-than-usual mental clarity (the 'flickers')",
      "Improved sleep depth — you may dream more vividly",
      "Conversations feel slightly more fluid — less word-searching",
      "Energy levels may stabilize in the afternoon (less of the '3 PM crash')",
    ],
    warningSign: "If Bacopa causes drowsiness, switch it to your evening meal for 3–5 days, then gradually move back to morning. This affects approximately 12% of users and resolves quickly.",
  },
  {
    week: 3,
    title: "Synaptic Reconnection",
    subtitle: "Rebuilding the Pathways",
    description:
      "Acetylcholine channels are actively being reconstructed. Short-term memory shows measurable improvement. This is the week where most members transition from 'hoping it works' to 'feeling it work.' The neuroprotective stack (Lion's Mane + Magnesium L-Threonate) reaches full efficacy.",
    scienceBrief:
      "NGF (Nerve Growth Factor) stimulation from Lion's Mane typically requires 14–21 days to produce observable effects. By week 3, synaptogenesis — the formation of new synaptic connections — is actively occurring in the hippocampus and prefrontal cortex. fMRI studies show increased connectivity patterns in these regions.",
    tasks: [
      { id: "w3t1", label: "Maintain complete daily protocol", completed: false, timeOfDay: "morning", duration: "Ongoing" },
      { id: "w3t2", label: "Introduce midday neuroprotective stack (Lion's Mane + Mg)", completed: false, timeOfDay: "midday", duration: "2 min" },
      { id: "w3t3", label: "Complete weekly memory benchmark test", completed: false, timeOfDay: "afternoon", duration: "20 min" },
      { id: "w3t4", label: "Record number of names recalled without effort today", completed: false, timeOfDay: "evening", duration: "3 min" },
    ],
    milestone: "Active reconstruction of acetylcholine channels",
    expectedChanges: [
      "Noticeable improvement in short-term memory (remembering where you put your keys, what you walked into a room for)",
      "Names and faces connect more easily during conversations",
      "Reading comprehension improves — you retain more from a single reading",
      "Afternoon brain exercises feel progressively easier",
    ],
    warningSign: "A temporary 'plateau' feeling around day 18–20 is normal. The brain is consolidating new neural pathways. Do not increase doses — maintain consistency.",
  },
  {
    week: 4,
    title: "Consolidation",
    subtitle: "One Month Milestone",
    description:
      "Your first full month on the protocol. Brain fog should be noticeably reduced. Family members may comment on the change before you fully recognize it yourself — this is extremely common. The Month 1 Assessment provides your first quantitative measure of progress.",
    scienceBrief:
      "At 30 days, circulating cadmium levels have typically decreased by 18–26% (urinary cadmium excretion data). Acetylcholine receptor density in the hippocampus begins measurable recovery. The combination of reduced neurotoxic load and enhanced neurotransmitter synthesis creates a positive feedback loop that accelerates improvement.",
    tasks: [
      { id: "w4t1", label: "Complete Month 1 comprehensive assessment", completed: false, timeOfDay: "morning", duration: "30 min" },
      { id: "w4t2", label: "Adjust dosages if recommended by assessment results", completed: false, timeOfDay: "morning", duration: "10 min" },
      { id: "w4t3", label: "Ask a family member to describe changes they have noticed", completed: false, timeOfDay: "afternoon", duration: "15 min" },
      { id: "w4t4", label: "Complete Month 1 neurocognitive benchmark", completed: false, timeOfDay: "afternoon", duration: "25 min" },
    ],
    milestone: "Significant brain fog reduction",
    expectedChanges: [
      "Brain fog episodes reduced by approximately 40–60%",
      "Verbal fluency improvement — fewer 'tip of the tongue' moments",
      "Family members independently notice positive changes",
      "Improved confidence in conversations and daily decision-making",
    ],
    warningSign: "If you have not noticed any improvement by the end of week 4, contact support for a protocol adjustment consultation. Less than 6% of members need modifications at this stage.",
  },
  {
    week: 5,
    title: "Acceleration",
    subtitle: "Compound Effects Emerge",
    description:
      "The acceleration phase. All protocol compounds have reached optimal therapeutic concentration. Results compound as multiple neurological pathways repair simultaneously. Members often describe this week as 'the switch flipping' — a qualitative shift from gradual improvement to obvious difference.",
    scienceBrief:
      "At 35 days, the synergistic effects of multiple compounds reach a critical threshold. Bacopa-enhanced acetylcholine synthesis, Lion's Mane-stimulated NGF, and reduced cadmium burden create a compounding effect that neuroscientists call 'neurochemical momentum.' Brain-Derived Neurotrophic Factor (BDNF) levels peak, supporting rapid synaptic strengthening.",
    tasks: [
      { id: "w5t1", label: "Maintain optimized protocol (all adjustments from Week 4)", completed: false, timeOfDay: "morning", duration: "Ongoing" },
      { id: "w5t2", label: "Introduce activation recipes from the recipe guide", completed: false, timeOfDay: "midday", duration: "10 min" },
      { id: "w5t3", label: "Complete advanced memory exercises (spatial memory)", completed: false, timeOfDay: "afternoon", duration: "20 min" },
      { id: "w5t4", label: "Record concentration duration (how long can you focus without interruption)", completed: false, timeOfDay: "evening", duration: "3 min" },
    ],
    milestone: "Therapeutic concentration achieved across all compounds",
    expectedChanges: [
      "Sustained focus periods increase dramatically (30+ minutes without mind-wandering)",
      "Long-dormant memories begin surfacing unexpectedly",
      "Problem-solving ability feels noticeably sharper",
      "Sleep quality reaches a new baseline — waking feeling genuinely refreshed",
    ],
    warningSign: "Some members experience emotional moments when long-forgotten memories return. This is a positive sign of hippocampal recovery, though it can feel overwhelming. Journal about it — do not suppress the memories.",
  },
  {
    week: 6,
    title: "Deep Regeneration",
    subtitle: "Recovering What Was Lost",
    description:
      "Damaged neural pathways undergo deep regeneration. Long-term memories that seemed lost begin returning. This is often the most emotional week of the protocol — members recall conversations, names, and events they had not accessed in years. The brain is not creating new memories of these events; it is re-establishing access to memories that were always there, blocked by cadmium-damaged pathways.",
    scienceBrief:
      "Long-term memory retrieval depends on intact neural pathways between the hippocampus (storage index) and the neocortex (storage location). Cadmium damages these pathways through oxidative destruction of myelin sheaths. By week 6, the combination of reduced cadmium load, enhanced myelination (from Lion's Mane NGF), and restored acetylcholine signaling begins reopening access to previously 'unreachable' memory traces.",
    tasks: [
      { id: "w6t1", label: "Maintain complete daily protocol", completed: false, timeOfDay: "morning", duration: "Ongoing" },
      { id: "w6t2", label: "Complete long-term memory retrieval assessment", completed: false, timeOfDay: "afternoon", duration: "25 min" },
      { id: "w6t3", label: "Record recovered memories in your journal (dates, people, events)", completed: false, timeOfDay: "evening", duration: "15 min" },
      { id: "w6t4", label: "Assess independence in daily activities (driving, cooking, finances)", completed: false, timeOfDay: "evening", duration: "10 min" },
    ],
    milestone: "Long-term memory pathway recovery",
    expectedChanges: [
      "Unexpected recall of long-dormant memories (childhood events, old friendships, past experiences)",
      "Faces from the past connect with names more easily",
      "Reading books or watching films feels richer — you retain and connect details",
      "Family members may notice you referencing events they thought you had forgotten",
    ],
    warningSign: "Emotional processing of recovered memories is natural and healthy. However, if you experience significant anxiety or distress related to recovered memories, speak with a mental health professional — this is about support, not a protocol problem.",
  },
  {
    week: 7,
    title: "Fortification",
    subtitle: "Strengthening New Connections",
    description:
      "New synaptic connections are being fortified and stabilized. Results transition from 'improvement' to 'new normal.' The brain exercises this week focus on multi-task processing — the most demanding cognitive challenge — to stress-test and strengthen your rebuilt neural architecture.",
    scienceBrief:
      "Synaptic consolidation follows a pattern: formation (weeks 3–5), strengthening (weeks 5–7), and stabilization (weeks 7–8). During fortification, the newly formed synapses undergo 'long-term potentiation' (LTP) — the molecular basis of learning and memory. Consistent protocol adherence during this phase is critical for permanent results.",
    tasks: [
      { id: "w7t1", label: "Maintain full maintenance protocol", completed: false, timeOfDay: "morning", duration: "Ongoing" },
      { id: "w7t2", label: "Begin 'sharp mind' rituals (advanced cognitive challenges)", completed: false, timeOfDay: "afternoon", duration: "20 min" },
      { id: "w7t3", label: "Complete comparative neurocognitive benchmark (vs. Week 1)", completed: false, timeOfDay: "afternoon", duration: "30 min" },
      { id: "w7t4", label: "Plan your post-8-week maintenance protocol", completed: false, timeOfDay: "evening", duration: "15 min" },
    ],
    milestone: "Cognitive results stabilization",
    expectedChanges: [
      "Multi-tasking ability returns — handling multiple conversation threads, cooking while following a recipe",
      "Decision-making confidence reaches pre-decline levels",
      "Brain exercise scores plateau at a significantly higher level than Week 1",
      "The 'new clarity' begins feeling like your natural state rather than a novelty",
    ],
    warningSign: "Do not reduce protocol adherence because you feel better. Week 7 fortification is what makes results permanent. Stopping early is the #1 reason for partial results.",
  },
  {
    week: 8,
    title: "Complete Transformation",
    subtitle: "Your New Cognitive Baseline",
    description:
      "The culmination of your 8-week journey. Your final comprehensive assessment will quantify the transformation. Most members see a 40–65% improvement in cognitive benchmark scores. You will transition from the intensive protocol to a streamlined maintenance protocol designed to protect your results long-term.",
    scienceBrief:
      "At 56 days, cadmium chelation has typically reduced circulating cadmium by 34–48%. Acetylcholine receptor density has increased measurably. BDNF levels are elevated. The maintenance protocol preserves these gains by continuing low-dose chelation and neuroprotective supplementation while reducing the daily time commitment from ~45 minutes to ~15 minutes.",
    tasks: [
      { id: "w8t1", label: "Complete final comprehensive cognitive assessment", completed: false, timeOfDay: "morning", duration: "35 min" },
      { id: "w8t2", label: "Compare results: Week 1 baseline vs. Week 8 final", completed: false, timeOfDay: "morning", duration: "15 min" },
      { id: "w8t3", label: "Set up your ongoing maintenance protocol", completed: false, timeOfDay: "afternoon", duration: "20 min" },
      { id: "w8t4", label: "Share your results with family (and encourage them to start)", completed: false, timeOfDay: "evening", duration: "30 min" },
    ],
    milestone: "Complete cognitive recovery — entering maintenance phase",
    expectedChanges: [
      "Cognitive benchmark scores 40–65% higher than Week 1 baseline",
      "Brain fog episodes reduced by 80–95%",
      "Verbal fluency, memory recall, and focus all significantly improved",
      "Independence in daily activities fully restored or enhanced",
    ],
    warningSign: "Transitioning to maintenance too quickly can cause a temporary setback. Follow the maintenance protocol guide exactly for the first 30 days post-protocol, then you may gradually simplify.",
  },
];

// ─── RECIPES ──────────────────────────────────────────────────────────────────

export const RECIPES: Recipe[] = [
  {
    id: "r1",
    title: "Morning Cleanse Tonic",
    emoji: "🍯",
    time: "3 min",
    ingredients: ["1 tbsp cedar honey (raw)", "200ml warm filtered water", "1/4 fresh lemon", "1/4 tsp turmeric powder"],
    instructions: [
      "Heat filtered water to warm (not boiling — stay below 45C/113F).",
      "Dissolve cedar honey completely in the warm water.",
      "Squeeze fresh lemon juice and add turmeric.",
      "Stir well and drink on empty stomach, 30 minutes before breakfast.",
    ],
    compound: "Cedar Honey DHA + Citric Acid",
    benefit: "Cadmium chelation — binds and removes heavy metals from the gut lining",
    tier: "protocol",
    bestTime: "6:30–7:00 AM",
  },
  {
    id: "r2",
    title: "Neuroprotective Smoothie",
    emoji: "🫐",
    time: "5 min",
    ingredients: ["1 banana", "1 scoop Bacopa Monnieri powder (300mg)", "200ml almond milk", "1 tbsp cedar honey", "1/2 cup blueberries", "1 tbsp chia seeds"],
    instructions: [
      "Add all ingredients to a blender.",
      "Blend for 30 seconds until smooth and creamy.",
      "Serve immediately to preserve active compounds and antioxidant potency.",
      "Consume within 15 minutes — bacosides degrade with air exposure.",
    ],
    compound: "Bacopa Monnieri + Anthocyanins + Cedar Honey",
    benefit: "Acetylcholine synthesis support combined with antioxidant neuroprotection",
    tier: "protocol",
    bestTime: "8:00–9:00 AM",
  },
  {
    id: "r3",
    title: "Synaptic Reconnection Tea",
    emoji: "🍵",
    time: "4 min",
    ingredients: ["1 green tea bag (or 1 tsp loose leaf)", "1 tsp cedar honey", "Fresh mint leaves (4–5)", "200ml hot water (80C/176F)"],
    instructions: [
      "Heat water to 80C/176F (not boiling — excessive heat destroys catechins).",
      "Add green tea and fresh mint leaves. Steep for exactly 3 minutes.",
      "Remove tea bag/leaves. Allow to cool 2 minutes.",
      "Add cedar honey and stir. Consume during your afternoon brain exercise.",
    ],
    compound: "L-Theanine + Polyphenols + Cedar Honey",
    benefit: "Alpha brain wave promotion for calm focus during cognitive exercises",
    tier: "protocol",
    bestTime: "3:00–4:00 PM",
  },
  {
    id: "r4",
    title: "Neural Activation Bowl",
    emoji: "🥣",
    time: "5 min",
    ingredients: ["1/2 cup rolled oats", "2 tbsp chopped walnuts", "1 tbsp cedar honey", "Fresh blueberries (handful)", "1 tbsp chia seeds", "1/2 tsp cinnamon"],
    instructions: [
      "Prepare oats with warm water or milk (do not microwave — use stovetop).",
      "Add chopped walnuts and chia seeds while warm.",
      "Top with fresh blueberries and sprinkle cinnamon.",
      "Drizzle cedar honey last — never heat the honey directly.",
    ],
    compound: "Omega-3 + Anthocyanins + Cedar Honey + Cinnamaldehyde",
    benefit: "Multi-pathway neuroprotection: anti-inflammatory, antioxidant, and chelation in one meal",
    tier: "accelerator",
    bestTime: "8:00–9:00 AM",
  },
  {
    id: "r5",
    title: "Dr. Cox's Golden Elixir",
    emoji: "🥛",
    time: "3 min",
    ingredients: ["1 tsp cedar honey", "1/2 tsp turmeric powder", "Pinch of freshly ground black pepper", "1 tsp virgin coconut oil", "150ml warm milk (any type)"],
    instructions: [
      "Warm milk gently on stovetop — do not boil.",
      "Mix in turmeric, black pepper, and coconut oil while warm.",
      "Allow to cool below 45C, then add cedar honey.",
      "Drink 1 hour before bedtime for maximum overnight neural repair.",
    ],
    compound: "Curcumin + Piperine + MCTs + Cedar Honey",
    benefit: "Overnight glymphatic clearance support — brain detoxification peaks during sleep",
    tier: "accelerator",
    bestTime: "8:00–9:00 PM",
  },
  {
    id: "r6",
    title: "Preventive Family Salad",
    emoji: "🥗",
    time: "8 min",
    ingredients: ["Mixed dark leafy greens (spinach, kale, arugula)", "100g grilled wild salmon", "1/2 avocado, sliced", "Handful of walnuts", "Extra virgin olive oil", "Fresh lemon juice", "1 tbsp hemp seeds"],
    instructions: [
      "Arrange leafy greens as the base on each plate.",
      "Add flaked grilled salmon and sliced avocado.",
      "Scatter walnuts and hemp seeds on top.",
      "Dress with olive oil and fresh lemon. Serve to the whole family.",
    ],
    compound: "Omega-3 (EPA/DHA) + Vitamin E + Monounsaturated Fats + Plant Lignans",
    benefit: "Whole-family neuroprotection — every ingredient targets a different cadmium-damage pathway",
    tier: "family",
    bestTime: "12:00–1:00 PM",
  },
  {
    id: "r7",
    title: "Focus Flow Matcha",
    emoji: "🍃",
    time: "3 min",
    ingredients: ["1 tsp ceremonial grade matcha", "150ml oat milk", "1/2 tsp cedar honey", "1/4 tsp lion's mane powder"],
    instructions: [
      "Sift matcha powder into a bowl to remove clumps.",
      "Add 30ml hot water (80C) and whisk vigorously until frothy.",
      "Warm oat milk and pour over matcha.",
      "Stir in lion's mane powder and cedar honey. Drink mindfully.",
    ],
    compound: "EGCG + L-Theanine + Hericenones + Cedar Honey",
    benefit: "Sustained focus without jitters — synergistic calm alertness",
    tier: "accelerator",
    bestTime: "10:00–11:00 AM",
  },
  {
    id: "r8",
    title: "Bedtime Brain Recovery Bites",
    emoji: "🌙",
    time: "10 min",
    ingredients: ["1 cup rolled oats", "1/2 cup almond butter", "2 tbsp cedar honey", "2 tbsp dark chocolate chips (85%+)", "1 tbsp flaxseed meal", "1/2 tsp vanilla extract"],
    instructions: [
      "Combine oats, almond butter, honey, and vanilla in a bowl.",
      "Fold in dark chocolate chips and flaxseed meal.",
      "Roll into 12 small balls (approximately 1 inch each).",
      "Refrigerate for 30 minutes. Store in fridge for up to 5 days. Eat 2 bites 1 hour before bed.",
    ],
    compound: "Tryptophan + Magnesium + Flavanols + Cedar Honey",
    benefit: "Pre-sleep serotonin support — promotes deep restorative sleep for overnight brain repair",
    tier: "family",
    bestTime: "8:00–9:00 PM",
  },
];

// ─── DEMO USER ────────────────────────────────────────────────────────────────

export const DEMO_USER: UserProfile = {
  name: "Robert Anderson",
  email: "robert.anderson@cognicare.com",
  purchasedTiers: ["protocol", "accelerator", "family", "circle"],
  startDate: "2026-03-10",
  currentWeek: 2,
  streak: 11,
  brainScore: 72,
};

// ─── DAILY TIPS (56 tips, 1 per day of protocol) ─────────────────────────────

export const DAILY_TIPS: string[] = [
  // Week 1
  "Cedar honey is most effective when consumed on an empty stomach with warm (not boiling) water. The ideal temperature below 45°C/113°F preserves the bioactive compounds responsible for cadmium chelation.",
  "Bacopa Monnieri should be taken with a fat source (coconut oil, avocado, or nuts) to improve absorption of its fat-soluble bacosides by up to 60%.",
  "The first 3-5 days of the protocol may cause mild detox symptoms — slight headache, fatigue, or brain fog increase. This is normal and indicates cadmium mobilization has begun.",
  "Hydration amplifies chelation. Aim for 2.5-3 liters of filtered water daily during Week 1 to support kidney clearance of mobilized heavy metals.",
  "Green tea's L-theanine works synergistically with the protocol. Brew at 70-80°C for 2-3 minutes — never boiling — to maximize L-theanine while minimizing tannins.",
  "Your brain uses 20% of your body's energy. During the protocol, increase healthy fats intake by 15-20% to fuel neural repair processes.",
  "Sleep is when your brain's glymphatic system clears toxins. Aim for 7-9 hours during Week 1 — this is when chelation compounds do their deepest work.",
  // Week 2
  "By Day 8-10, many users report their first 'clarity window' — a brief period where thinking feels noticeably sharper. This is the first sign of synaptic reconnection.",
  "Omega-3 fatty acids (specifically DHA) comprise 40% of the polyunsaturated fatty acids in your brain. Your daily fish oil is literally rebuilding neural membranes.",
  "Turmeric's curcumin has poor bioavailability alone. Always combine with black pepper (piperine) — this increases absorption by 2,000%.",
  "The walnuts in your protocol contain alpha-linolenic acid (ALA), which your body converts to DHA. They're essentially a plant-based brain repair material.",
  "Consistency matters more than perfection. Missing one step is better than skipping an entire day. Your neural pathways respond to cumulative exposure.",
  "The evening elixir's magnesium L-threonate is the only form of magnesium clinically proven to cross the blood-brain barrier and increase brain magnesium levels.",
  "Keep a brief journal: rate your brain fog 1-10 each evening. By Week 2's end, you should see the first downward trend in your scores.",
  // Week 3
  "Lion's Mane mushroom stimulates Nerve Growth Factor (NGF) production. NGF is the protein that literally grows and repairs neurons — it's the backbone of Week 3's acceleration.",
  "The synaptic reconnection phase (Week 3) may cause vivid dreams. This is a positive sign — it indicates increased neural activity during REM sleep.",
  "Magnesium L-threonate taken 1-2 hours before bed not only supports neural repair but significantly improves sleep quality and next-day cognitive performance.",
  "Your brain creates approximately 700 new neurons daily in the hippocampus. The protocol's compounds ensure these new neurons survive and integrate into existing circuits.",
  "Avoid alcohol during Week 3 — it directly inhibits NGF production and can slow synaptic reconnection by up to 40% during this critical phase.",
  "The combination of Lion's Mane + Bacopa creates a synergistic effect: Lion's Mane grows new neural connections while Bacopa strengthens the chemical signaling between them.",
  "Sunlight exposure (15-20 min daily) boosts Vitamin D synthesis, which research shows enhances the brain's responsiveness to the neuroprotective stack compounds.",
  // Week 4
  "You're at the Month 1 checkpoint. Most users report 40-60% reduction in brain fog symptoms by this point. If you're tracking, compare your Week 1 and Week 4 journal entries.",
  "Your acetylcholine levels — the neurotransmitter responsible for memory and learning — should be measurably higher now. This manifests as improved recall and faster information processing.",
  "The protocol works in waves, not lines. You may have a 'dip day' where fog returns briefly. This is normal neural reorganization — not regression.",
  "Intermittent fasting (12-14 hour window) enhances autophagy — the brain's cellular cleanup process. Consider timing your last meal 3 hours before bed.",
  "Stress directly increases cadmium absorption from food. Practice 5 minutes of deep breathing before meals during Week 4 to optimize nutrient uptake.",
  "The brain exercises in your protocol target neuroplasticity — your brain's ability to form new neural pathways. Think of them as physical therapy for your neurons.",
  "Dark chocolate (85%+ cacao) contains flavonoids that increase cerebral blood flow by up to 30%. One square daily complements the protocol beautifully.",
  // Week 5
  "The acceleration phase begins. Your neural pathways are now strong enough to handle increased compound dosages. Follow the Week 5 adjustments precisely.",
  "BDNF (Brain-Derived Neurotrophic Factor) levels peak during weeks 5-6. This protein is essentially fertilizer for your brain — it helps neurons grow, connect, and survive.",
  "Exercise amplifies BDNF production by 200-300%. Even a 20-minute brisk walk during Week 5 significantly accelerates your cognitive recovery.",
  "Cold exposure (cold shower for 30-60 seconds) triggers norepinephrine release, which enhances focus and supports the acceleration compounds in Week 5.",
  "Your memory should now handle multi-step tasks more easily. Test yourself: try remembering a 7-digit number after a 30-second delay. Compare to Week 1.",
  "The protocol's compounds have a cumulative effect. By Week 5, tissue concentrations of key neuroprotectives are 3-4x higher than Week 1 levels.",
  "Social interaction is cognitive exercise. Engage in meaningful conversations daily — they activate multiple brain regions simultaneously and reinforce new neural pathways.",
  // Week 6
  "Deep regeneration phase. Your brain is now actively replacing damaged myelin sheaths — the insulation around nerve fibers that enables fast signal transmission.",
  "The omega-3 protocol reaches peak effectiveness around Week 6. DHA is now fully integrated into your neural membranes, improving signal speed by up to 20%.",
  "Meditation (even 10 minutes daily) has been shown to increase cortical thickness. Combined with the protocol, it accelerates structural brain changes.",
  "Your cadmium burden should be significantly reduced by now. The body's natural chelation processes, amplified by the protocol, are working continuously.",
  "B-vitamins (especially B12 and folate) support methylation — the process by which your body neutralizes and eliminates cadmium. Ensure adequate intake through diet.",
  "Week 6 is when many users report improved emotional regulation. This reflects enhanced prefrontal cortex function — the brain's executive control center.",
  "Blueberries contain anthocyanins that accumulate in brain regions responsible for memory. A handful daily during Week 6 provides measurable neuroprotective benefits.",
  // Week 7
  "Fortification phase. The neural pathways rebuilt during weeks 3-6 are now being strengthened and made permanent through repeated activation and myelination.",
  "Your brain's default mode network — active during rest and reflection — should now show improved coherence. This manifests as less mental 'noise' and clearer thinking.",
  "Resistance training (even bodyweight exercises) triggers IGF-1 release, a growth factor that works alongside BDNF to protect and strengthen your recovering neurons.",
  "The protocol's selenium content helps produce glutathione — your brain's master antioxidant. This provides ongoing protection against future cadmium exposure.",
  "Practice spaced repetition: review important information at increasing intervals. Your strengthened neural pathways now support this advanced memory technique.",
  "Gratitude journaling activates the prefrontal cortex and releases dopamine. 3 items each evening — this simple practice reinforces Week 7's fortification goals.",
  "Your sleep architecture should now be more organized — more time in deep sleep and REM. This means more efficient overnight neural maintenance and toxin clearance.",
  // Week 8
  "Final transformation week. Your cognitive function should now be measurably improved across all domains: memory, focus, processing speed, and verbal fluency.",
  "Take the cognitive assessment again and compare to your baseline. Most protocol completers see a 30-45% improvement in overall cognitive scores.",
  "The 8-week protocol has rebuilt the foundation. Maintenance is simpler: the core Morning Cleanse + Evening Elixir, 3 days/week, preserves your gains indefinitely.",
  "Cadmium has a biological half-life of 10-30 years in the body. The protocol accelerated your clearance dramatically, but ongoing maintenance prevents re-accumulation.",
  "Your brain has demonstrated remarkable neuroplasticity over these 8 weeks. The same capacity for change that allowed damage also allowed recovery.",
  "Share your experience. Your story could motivate someone who is where you were 8 weeks ago — uncertain whether cognitive recovery was truly possible.",
  "Congratulations. You have completed one of the most comprehensive cognitive recovery protocols available. Your brain is stronger, clearer, and more resilient than when you started.",
  "Remember: the protocol didn't just treat symptoms — it addressed the root cause. The neural pathways you've rebuilt are yours to keep, as long as you maintain them.",
];

// ─── SCIENCE ARTICLES ─────────────────────────────────────────────────────────

export interface ScienceArticle {
  id: string;
  title: string;
  category: string;
  readTime: string;
  summary: string;
  sections: { heading: string; content: string }[];
  references: string[];
  tier: string; // 'protocol' | 'circle'
}

export const SCIENCE_ARTICLES: ScienceArticle[] = [
  {
    id: "cadmium-neurotoxicity",
    title: "Cadmium Chloride and Neurotoxicity: How a Common Environmental Toxin Damages Your Brain",
    category: "Neurotoxicology",
    readTime: "8 min",
    summary: "Cadmium is one of the most pervasive environmental neurotoxins, found in food, water, cigarette smoke, and industrial emissions. This article explains the mechanisms by which cadmium damages neural tissue and why traditional medicine often misses the connection.",
    sections: [
      {
        heading: "What Is Cadmium and Where Does It Come From?",
        content: "Cadmium (Cd) is a heavy metal naturally present in the Earth's crust. While trace amounts exist in most soils, human activities — mining, industrial manufacturing, phosphate fertilizers, and fossil fuel combustion — have dramatically increased environmental cadmium levels over the past century. The primary exposure routes for most people are dietary (rice, leafy vegetables, root crops, shellfish, organ meats) and inhalation (cigarette smoke, industrial emissions). A single cigarette contains 1-2 micrograms of cadmium, and smokers accumulate 4-5 times higher body burdens than non-smokers. Even non-smokers in industrialized nations carry measurable cadmium burdens from food and water alone."
      },
      {
        heading: "How Cadmium Crosses the Blood-Brain Barrier",
        content: "The blood-brain barrier (BBB) normally protects the brain from toxic substances. However, cadmium exploits molecular mimicry — it resembles essential metals like zinc and calcium at the molecular level. Cadmium ions enter the brain through the same transport proteins designed for these essential nutrients: DMT1 (divalent metal transporter 1) and ZIP8/ZIP14 zinc transporters. Once cadmium crosses the BBB, it accumulates preferentially in the hippocampus (memory center), prefrontal cortex (executive function), and cerebellum (coordination). Unlike many toxins, cadmium has an extremely long biological half-life of 10-30 years in human tissue, meaning even low-level chronic exposure produces significant accumulation over time."
      },
      {
        heading: "The Three Mechanisms of Cadmium-Induced Brain Damage",
        content: "Cadmium damages the brain through three primary mechanisms: (1) Oxidative Stress — cadmium depletes glutathione (the brain's master antioxidant) and generates reactive oxygen species (ROS) that damage cell membranes, proteins, and DNA. This is particularly devastating in the brain, which consumes 20% of the body's oxygen and is highly susceptible to oxidative damage. (2) Disruption of Calcium Signaling — by mimicking calcium, cadmium interferes with neurotransmitter release, synaptic plasticity, and the calcium-dependent processes essential for memory formation. This explains why early cadmium toxicity symptoms often present as memory lapses and difficulty concentrating. (3) Neuroinflammation — cadmium activates microglia (the brain's immune cells) and triggers chronic low-grade inflammation. This neuroinflammation damages myelin sheaths, reduces synaptic density, and accelerates neuronal death in affected regions."
      },
      {
        heading: "Symptoms: The 'Brain Fog' Connection",
        content: "The constellation of symptoms caused by cadmium neurotoxicity — difficulty concentrating, memory lapses, mental fatigue, word-finding difficulty, slowed processing speed — is commonly described as 'brain fog.' Because these symptoms develop gradually over years and overlap with aging, stress, and other conditions, cadmium's role is frequently overlooked. Studies show that individuals with higher cadmium blood levels score significantly lower on cognitive assessments, even after controlling for age, education, and other heavy metal exposures (Ciesielski et al., 2012). The relationship is dose-dependent: higher cadmium burden correlates with greater cognitive impairment."
      },
      {
        heading: "Why Standard Medical Testing Misses It",
        content: "Standard blood tests measure only recent cadmium exposure (last 3-6 months). Since cadmium accumulates in tissues — primarily kidneys, liver, and brain — blood levels dramatically underestimate total body burden. A person with 'normal' blood cadmium but 30 years of low-level exposure may have significant tissue accumulation. Urine cadmium testing better reflects long-term exposure but is rarely ordered unless occupational exposure is suspected. This testing gap means millions of people experiencing cadmium-related cognitive decline receive diagnoses of 'age-related cognitive changes' or 'stress' without addressing the underlying cause."
      }
    ],
    references: [
      "Ciesielski T, et al. Cadmium exposure and neurodevelopmental outcomes in U.S. adults. Environ Health Perspect. 2012;120(5):758-763.",
      "Wang B, Du Y. Cadmium and its neurotoxic effects. Oxidative Medicine and Cellular Longevity. 2013;2013:898034.",
      "Méndez-Armenta M, Ríos C. Cadmium neurotoxicity. Environmental Toxicology and Pharmacology. 2007;23(3):350-358.",
      "ATSDR. Toxicological Profile for Cadmium. Agency for Toxic Substances and Disease Registry. 2012.",
      "Nordberg GF. Historical perspectives on cadmium toxicology. Toxicology and Applied Pharmacology. 2009;238(3):192-200."
    ],
    tier: "protocol"
  },
  {
    id: "bacopa-monnieri",
    title: "Bacopa Monnieri: The Ancient Herb That Rebuilds Memory — A Meta-Analysis Review",
    category: "Nootropics",
    readTime: "7 min",
    summary: "Bacopa monnieri has been used in Ayurvedic medicine for over 3,000 years to enhance memory and cognition. Modern clinical trials validate these traditional claims with rigorous evidence.",
    sections: [
      {
        heading: "Historical Context and Modern Validation",
        content: "Bacopa monnieri (Brahmi) has been a cornerstone of Ayurvedic medicine since at least 600 AD, traditionally prescribed for memory enhancement, anxiety reduction, and cognitive longevity. What makes Bacopa remarkable in modern pharmacology is that its traditional uses have been largely validated by peer-reviewed clinical trials — a rare achievement for any traditional medicine. The active compounds, bacosides A and B, have been isolated, characterized, and shown to produce measurable cognitive improvements in randomized controlled trials across multiple populations."
      },
      {
        heading: "Mechanism of Action: Acetylcholine and Beyond",
        content: "Bacopa enhances cognition through multiple pathways: (1) Cholinergic Enhancement — bacosides increase acetylcholine availability by inhibiting acetylcholinesterase, the enzyme that breaks down acetylcholine. This is the same mechanism targeted by Alzheimer's drugs like donepezil, but Bacopa achieves it through natural modulation rather than aggressive inhibition. (2) Antioxidant Protection — Bacopa is a potent antioxidant in brain tissue, scavenging free radicals and protecting neurons from oxidative damage. This is particularly relevant for cadmium-exposed brains, where oxidative stress is elevated. (3) Dendritic Branching — perhaps most remarkably, chronic Bacopa supplementation has been shown to increase dendritic branching length and intersection points in hippocampal neurons. In simple terms: Bacopa literally helps neurons grow more connections."
      },
      {
        heading: "Clinical Evidence: What the Trials Show",
        content: "A comprehensive meta-analysis by Kongkeaw et al. (2014) analyzed 9 randomized controlled trials with 518 total participants. The results showed significant improvements in attention, cognitive processing, and working memory with Bacopa supplementation (300mg/day standardized to 50% bacosides). Key findings: attention speed improved within 4 weeks, memory consolidation improved by week 8-12, and the effects were more pronounced in individuals with pre-existing cognitive complaints. A 12-week trial by Calabrese et al. (2008) in adults aged 65+ showed significant improvements in verbal learning, memory acquisition, and delayed recall compared to placebo. Importantly, these cognitive benefits persisted for 4 weeks after supplementation ceased, suggesting structural rather than merely pharmacological changes."
      },
      {
        heading: "Dosage, Timing, and Absorption",
        content: "Effective dosage in clinical trials ranges from 300-600mg daily of extract standardized to 50% bacosides. Bacopa is fat-soluble — absorption increases dramatically (up to 60%) when taken with dietary fat. The CogniCare protocol times Bacopa at 8:00 AM with breakfast for this reason. Cognitive benefits appear gradually: initial effects on attention within 2-4 weeks, with memory improvements requiring 8-12 weeks of consistent use. This timeline aligns with the structural neural changes (dendritic growth) rather than just neurotransmitter modulation. Side effects are minimal: occasional mild GI upset in the first week, which typically resolves."
      }
    ],
    references: [
      "Kongkeaw C, et al. Meta-analysis of randomized controlled trials on cognitive effects of Bacopa monnieri extract. J Ethnopharmacol. 2014;151(1):528-535.",
      "Calabrese C, et al. Effects of a standardized Bacopa monnieri extract on cognitive performance in older adults. J Altern Complement Med. 2008;14(6):707-713.",
      "Stough C, et al. Examining the nootropic effects of Bacopa monnieri on human cognitive functioning. Phytother Res. 2008;22(12):1629-1634.",
      "Rajan KE, et al. Molecular and functional characterization of Bacopa monnieri. Evidence-Based Complementary and Alternative Medicine. 2015;2015:945217."
    ],
    tier: "protocol"
  },
  {
    id: "lions-mane-ngf",
    title: "Lion's Mane and Nerve Growth Factor: How a Mushroom Regenerates Neurons",
    category: "Neurogenesis",
    readTime: "6 min",
    summary: "Hericium erinaceus (Lion's Mane) is the only known natural substance that stimulates both NGF and BDNF production — the two key proteins responsible for growing, maintaining, and protecting neurons.",
    sections: [
      {
        heading: "The Discovery of NGF-Stimulating Compounds",
        content: "In 1991, Japanese researcher Dr. Hirokazu Kawagishi made a groundbreaking discovery: compounds isolated from Hericium erinaceus (Lion's Mane mushroom) could stimulate the synthesis of Nerve Growth Factor (NGF) in cultured cells. These compounds, named hericenones (from the fruiting body) and erinacines (from the mycelium), were the first natural substances shown to cross the blood-brain barrier and directly stimulate NGF production in the brain. NGF is a neurotrophin — a protein essential for the growth, maintenance, and survival of neurons. Without adequate NGF, neurons atrophy, connections weaken, and cognitive function declines. This discovery opened an entirely new avenue for addressing neurodegenerative conditions."
      },
      {
        heading: "NGF and BDNF: Your Brain's Growth Factors",
        content: "Lion's Mane is unique because it stimulates both NGF and BDNF (Brain-Derived Neurotrophic Factor). NGF primarily supports the cholinergic neurons in the basal forebrain — the same neurons that degenerate in Alzheimer's disease and are damaged by cadmium exposure. BDNF, often called 'fertilizer for the brain,' promotes neuroplasticity, supports new neuron formation (neurogenesis) in the hippocampus, and strengthens synaptic connections. Together, these two neurotrophins provide comprehensive support for neural repair: NGF protects and maintains existing neurons while BDNF facilitates the growth of new connections. This dual action is why Lion's Mane is the centerpiece of the CogniCare protocol's Week 3 'Synaptic Reconnection' phase."
      },
      {
        heading: "Clinical Evidence in Humans",
        content: "A landmark study by Mori et al. (2009) gave Lion's Mane extract (1000mg, 3x daily) to Japanese adults aged 50-80 with mild cognitive impairment for 16 weeks. The treatment group showed significant improvements on cognitive function scales at weeks 8, 12, and 16 compared to placebo. Critically, cognitive scores declined 4 weeks after supplementation stopped, suggesting the need for ongoing use. A 2020 study by Saitsu et al. demonstrated that Lion's Mane supplementation (3.2g daily for 12 weeks) significantly improved cognitive function in healthy adults, with particular improvements in recognition memory and processing speed. Neuroimaging studies have also shown increased hippocampal volume in participants taking Lion's Mane — physical evidence of neurogenesis in the human brain."
      },
      {
        heading: "Why Dual Extraction Matters",
        content: "Not all Lion's Mane supplements are equivalent. The bioactive compounds are distributed between two parts: hericenones are found in the fruiting body and are alcohol-soluble, while erinacines are found in the mycelium and are water-soluble. A dual-extracted (hot water + alcohol) product from the fruiting body provides the broadest spectrum of bioactive compounds. The CogniCare protocol specifies 500mg of dual-extracted Lion's Mane standardized to beta-glucans content. Look for products that specify extraction method and beta-glucan percentage (>25%) on the label."
      }
    ],
    references: [
      "Mori K, et al. Improving effects of the mushroom Yamabushitake on mild cognitive impairment. Phytother Res. 2009;23(3):367-372.",
      "Saitsu Y, et al. Improvement of cognitive functions by oral intake of Hericium erinaceus. Biomedical Research. 2019;40(4):125-131.",
      "Kawagishi H, et al. Hericenones C, D and E, stimulators of nerve growth factor synthesis from the mushroom Hericium erinaceum. Tetrahedron Letters. 1991;32(35):4561-4564.",
      "Lai PL, et al. Neurotrophic properties of the Lion's Mane mushroom. Int J Med Mushrooms. 2013;15(6):539-554."
    ],
    tier: "protocol"
  },
  {
    id: "magnesium-threonate",
    title: "Magnesium L-Threonate: The Only Form That Reaches Your Brain",
    category: "Mineral Neuroscience",
    readTime: "5 min",
    summary: "Of all magnesium forms, only L-threonate has been clinically proven to cross the blood-brain barrier and increase brain magnesium concentrations, directly improving synaptic density and cognitive function.",
    sections: [
      {
        heading: "The Brain Magnesium Problem",
        content: "Magnesium is involved in over 600 enzymatic reactions in the body and is critical for neural function. An estimated 50-80% of the population is magnesium deficient. However, the brain presents a unique challenge: the blood-brain barrier is highly selective about which forms of magnesium it allows through. Standard magnesium supplements (oxide, citrate, glycinate) effectively raise blood and tissue magnesium but have minimal impact on brain concentrations. This is why people taking magnesium for cognitive symptoms often see benefits for muscle tension and sleep but limited improvements in memory and focus."
      },
      {
        heading: "The MIT Discovery",
        content: "In 2010, researchers at MIT led by Dr. Guosong Liu published a landmark paper in the journal Neuron demonstrating that a novel compound — magnesium L-threonate (MgT) — could effectively elevate brain magnesium levels in a way that other forms could not. The threonate molecule acts as a carrier, facilitating magnesium transport across the blood-brain barrier. In animal models, MgT increased brain magnesium by 15% (compared to negligible increases with other forms) and produced remarkable improvements in learning, working memory, and both short- and long-term memory. The mechanism: increased synaptic density in the hippocampus and prefrontal cortex."
      },
      {
        heading: "Human Clinical Evidence",
        content: "A 2016 randomized, double-blind, placebo-controlled trial (Liu et al., Alzheimer's Disease) tested MgT in adults aged 50-70 with cognitive complaints. After 12 weeks, the MgT group showed significant improvements in overall cognitive ability, with executive function and working memory showing the largest gains. Brain age, as measured by cognitive testing, reversed by an average of 9.4 years in the treatment group versus 0.6 years in placebo. A follow-up study confirmed these results and demonstrated that the cognitive improvements were maintained with continued supplementation. The effective dose is 144mg elemental magnesium from L-threonate form, taken in the evening (magnesium promotes relaxation and sleep quality)."
      },
      {
        heading: "Synergy with the CogniCare Protocol",
        content: "Magnesium L-threonate complements the CogniCare protocol in several critical ways: it provides the magnesium cofactor needed for glutathione synthesis (essential for cadmium detoxification), it increases synaptic density in the same brain regions damaged by cadmium (hippocampus, prefrontal cortex), and it improves sleep quality — the period when the brain's glymphatic system clears toxins most efficiently. The protocol introduces MgT in the Evening Elixir (Step 5) specifically because evening dosing optimizes both cognitive and sleep benefits."
      }
    ],
    references: [
      "Slutsky I, et al. Enhancement of learning and memory by elevating brain magnesium. Neuron. 2010;65(2):165-177.",
      "Liu G, et al. Efficacy and safety of MMFS-01, a synapse density enhancer, for treating cognitive impairment in older adults. J Alzheimers Dis. 2016;49(4):971-990.",
      "Mickley GA, et al. Dietary magnesium L-threonate and memory in rats. Pharmacology Biochemistry and Behavior. 2013;106:16-26."
    ],
    tier: "protocol"
  },
  {
    id: "cedar-honey-chelation",
    title: "Cedar Honey and Heavy Metal Chelation: Nature's Detoxification Agent",
    category: "Chelation Science",
    readTime: "5 min",
    summary: "Raw cedar honey contains unique polyphenols and organic acids that bind to cadmium ions, facilitating their safe removal from the body. This natural chelation is gentler and safer than pharmaceutical alternatives.",
    sections: [
      {
        heading: "Why Cedar Honey Is Different",
        content: "Not all honey is created equal for chelation purposes. Cedar honey (produced by bees foraging on cedar tree secretions) contains uniquely high concentrations of specific polyphenols — including quercetin, kaempferol, and chrysin — that have demonstrated metal-chelating properties in laboratory studies. These polyphenols form stable complexes with cadmium ions, effectively neutralizing them and facilitating renal excretion. Raw (unprocessed, unheated) cedar honey also contains enzymes, organic acids, and oligosaccharides that support gut health and improve the intestinal elimination pathway for chelated metals. The key is sourcing: the honey must be raw, unpasteurized, and ideally from Himalayan or Mediterranean cedar regions where the specific floral compounds are most concentrated."
      },
      {
        heading: "The Chelation Mechanism",
        content: "Chelation (from the Greek 'chele,' meaning claw) describes the process by which an organic molecule wraps around and binds a metal ion, rendering it chemically inert and water-soluble for excretion. Cedar honey's polyphenols achieve this through multiple hydroxyl groups that coordinate with cadmium's electron orbitals. This is fundamentally the same mechanism used by pharmaceutical chelators like EDTA and DMSA, but with important differences: honey's chelation is gentler, more selective (preferentially binding toxic metals over essential minerals), and comes with additional antioxidant and anti-inflammatory benefits. The organic acids in raw honey (gluconic acid, acetic acid) further acidify the gut environment, which improves cadmium mobilization from tissue stores."
      },
      {
        heading: "The Morning Protocol: Why Timing Matters",
        content: "The CogniCare protocol specifies cedar honey consumption first thing in the morning on an empty stomach (6:30 AM) for three evidence-based reasons: (1) Fasting state maximizes polyphenol absorption — food competition reduces bioavailability by up to 40%. (2) Morning cortisol levels are naturally elevated, which enhances kidney filtration rate and cadmium excretion. (3) The 90-minute gap before breakfast allows the chelation compounds to circulate systemically before being diluted by food intake. The warm water (not hot — below 45°C/113°F) serves as a vehicle: it dissolves the honey compounds for faster absorption and the warmth increases gut blood flow. Boiling water destroys the heat-sensitive enzymes and some polyphenols, reducing chelation capacity by 60-70%."
      },
      {
        heading: "Safety and Complementary Support",
        content: "Natural chelation with honey is significantly safer than pharmaceutical chelation, which can indiscriminately strip essential minerals (zinc, copper, iron) alongside toxic metals. However, even gentle chelation mobilizes stored cadmium into the bloodstream before it's excreted. This is why the CogniCare protocol emphasizes adequate hydration (2.5-3L daily), mineral-rich foods, and the neuroprotective stack — to protect the brain during the mobilization phase. Individuals with severe cadmium toxicity (occupational exposure, heavy smoking history) should consult a healthcare provider before beginning any chelation protocol, as rapid mobilization of large cadmium stores can temporarily worsen symptoms."
      }
    ],
    references: [
      "Lachman J, et al. Analysis of minority honey components: Possible use for the evaluation of honey quality. Food Chemistry. 2010;118(1):29-34.",
      "Alvarez-Suarez JM, et al. The composition and biological activity of honey: a focus on Manuka honey. Foods. 2014;3(3):420-432.",
      "Flora SJS, Pachauri V. Chelation in metal intoxication. Int J Environ Res Public Health. 2010;7(7):2745-2788.",
      "Khanal P, et al. Heavy metal chelating properties of natural polyphenols. Journal of Functional Foods. 2019;54:303-312."
    ],
    tier: "protocol"
  },
  {
    id: "omega3-dha-brain",
    title: "Omega-3 and DHA: Rebuilding the Brain's Physical Structure",
    category: "Nutritional Neuroscience",
    readTime: "6 min",
    summary: "DHA (docosahexaenoic acid) constitutes 40% of the polyunsaturated fatty acids in your brain. Supplementation literally provides the building material for neural membrane repair and new synapse formation.",
    sections: [
      {
        heading: "DHA: The Brain's Building Material",
        content: "Your brain is approximately 60% fat by dry weight, and DHA (docosahexaenoic acid) is the most abundant omega-3 fatty acid in neural tissue. DHA is concentrated in synaptic membranes — the precise locations where neurons communicate with each other. It influences membrane fluidity, receptor function, and signal transduction speed. When DHA levels are depleted (through poor diet, oxidative stress, or toxin exposure), neural membranes become rigid, synaptic transmission slows, and cognitive function degrades. This is not metaphorical — DHA deficiency physically changes the structure of your brain at the cellular level."
      },
      {
        heading: "DHA and Cadmium Recovery",
        content: "Cadmium-induced oxidative stress specifically targets the polyunsaturated fatty acids in neural membranes through lipid peroxidation — a chain reaction that destroys DHA molecules and damages membrane integrity. Research by Aschner et al. (2007) demonstrated that cadmium exposure reduces brain DHA content by 15-25% in affected regions. Supplementing with high-quality omega-3 (rich in DHA) provides the raw material for membrane repair. Studies show that DHA supplementation during chelation therapy accelerates cognitive recovery by 40% compared to chelation alone, because it addresses the structural damage while chelation addresses the toxic cause."
      },
      {
        heading: "Beyond Membranes: DHA's Signaling Role",
        content: "DHA is more than structural material — it's metabolized into specialized signaling molecules called resolvins and protectins that actively resolve neuroinflammation. Resolvin D1, derived from DHA, has been shown to reduce microglial activation (the neuroinflammation driving cadmium neurotoxicity) by up to 60% in laboratory studies. This anti-inflammatory action complements the anti-oxidant protection provided by the protocol's other compounds (Bacopa, turmeric) and addresses a different mechanism of cadmium-induced brain damage."
      },
      {
        heading: "Practical Supplementation",
        content: "The CogniCare protocol specifies 1000mg omega-3 fish oil with a minimum 500mg DHA content. Key considerations: (1) Quality matters — choose molecularly distilled oil tested for heavy metals (ironic but important: low-quality fish oil can contain cadmium). (2) Take with food containing fat for optimal absorption. (3) The triglyceride form has 70% better absorption than the ethyl ester form commonly found in cheaper supplements. (4) Algae-based DHA is an effective vegan alternative with comparable bioavailability. (5) Effects on cognitive function require 8-12 weeks to fully manifest, as membrane turnover and remodeling is a gradual process."
      }
    ],
    references: [
      "Dyall SC. Long-chain omega-3 fatty acids and the brain: a review. Curr Opin Clin Nutr Metab Care. 2015;18(2):139-146.",
      "Bazinet RP, Layé S. Polyunsaturated fatty acids and their metabolites in brain function and disease. Nat Rev Neurosci. 2014;15(12):771-785.",
      "Yurko-Mauro K, et al. Beneficial effects of docosahexaenoic acid on cognition in age-related cognitive decline. Alzheimers Dement. 2010;6(6):456-464.",
      "Aschner M, et al. Cadmium-induced alterations in lipid composition. Toxicol Sci. 2007."
    ],
    tier: "protocol"
  },
  {
    id: "curcumin-neuroinflammation",
    title: "Curcumin and Neuroinflammation: Turning Off the Brain's Fire",
    category: "Anti-Inflammatory Neuroscience",
    readTime: "5 min",
    summary: "Curcumin, the active compound in turmeric, crosses the blood-brain barrier and directly suppresses the neuroinflammatory cascades triggered by cadmium exposure — but only when properly formulated for bioavailability.",
    sections: [
      {
        heading: "Neuroinflammation: The Silent Driver",
        content: "Chronic neuroinflammation is increasingly recognized as a central mechanism in cognitive decline. When the brain's immune cells (microglia) are chronically activated — by cadmium, oxidative stress, or other insults — they release pro-inflammatory cytokines (TNF-alpha, IL-1beta, IL-6) that damage synapses, degrade myelin, and impair neurogenesis. This is distinct from acute inflammation (which is protective) — chronic neuroinflammation is destructive and self-perpetuating. Cadmium is a potent activator of microglial cells, and the resulting neuroinflammation persists even after cadmium levels begin to decrease, making anti-inflammatory intervention essential alongside chelation."
      },
      {
        heading: "Curcumin's Multi-Target Anti-Inflammatory Action",
        content: "Curcumin (diferuloylmethane) suppresses neuroinflammation through at least 4 molecular pathways: (1) It inhibits NF-\u03BAB, the master transcription factor for inflammatory gene expression. (2) It reduces COX-2 and 5-LOX enzyme activity, decreasing prostaglandin and leukotriene production. (3) It directly scavenges reactive oxygen and nitrogen species, breaking the oxidative stress \u2192 inflammation cycle. (4) It promotes the M2 (anti-inflammatory) microglial phenotype over the M1 (pro-inflammatory) phenotype. This multi-target approach is why curcumin often outperforms single-target pharmaceutical anti-inflammatories in chronic neuroinflammation models."
      },
      {
        heading: "The Bioavailability Challenge",
        content: "Raw turmeric powder contains only 3-5% curcumin by weight, and curcumin has notoriously poor bioavailability — approximately 1% of an oral dose reaches systemic circulation. This is why the CogniCare protocol always pairs turmeric with black pepper extract (piperine). Piperine inhibits glucuronidation in the gut and liver, the primary pathway by which the body eliminates curcumin. This simple addition increases curcumin bioavailability by 2,000% (Shoba et al., 1998). Additional strategies used in the protocol: consuming curcumin with dietary fat (increases absorption further), and using the organic turmeric form which retains its natural volatile oils that enhance absorption."
      },
      {
        heading: "Clinical Evidence for Cognitive Benefits",
        content: "A randomized, double-blind, placebo-controlled trial by Small et al. (2018) in the American Journal of Geriatric Psychiatry demonstrated that 90mg of bioavailable curcumin twice daily for 18 months significantly improved memory performance and attention in non-demented adults. Remarkably, PET brain scans showed significantly less amyloid and tau accumulation in the curcumin group — suggesting curcumin may protect against the protein aggregations associated with neurodegeneration. Memory test performance improved by 28% in the curcumin group versus no improvement in placebo."
      }
    ],
    references: [
      "Small GW, et al. Memory and Brain Amyloid and Tau Effects of a Bioavailable Form of Curcumin in Non-Demented Adults. Am J Geriatr Psychiatry. 2018;26(3):266-277.",
      "Shoba G, et al. Influence of piperine on the pharmacokinetics of curcumin. Planta Med. 1998;64(4):353-356.",
      "Hewlings SJ, Kalman DS. Curcumin: A Review of Its Effects on Human Health. Foods. 2017;6(10):92.",
      "Cole GM, et al. Neuroprotective effects of curcumin. Adv Exp Med Biol. 2007;595:197-212."
    ],
    tier: "protocol"
  },
  {
    id: "green-tea-ltheanine",
    title: "Green Tea, L-Theanine, and EGCG: The Cognitive Enhancement Duo",
    category: "Nootropics",
    readTime: "5 min",
    summary: "Green tea contains two powerful brain-active compounds: L-theanine (which promotes calm focus) and EGCG (which protects neurons from oxidative damage). Together, they create an ideal state for cognitive recovery.",
    sections: [
      {
        heading: "L-Theanine: Focus Without the Jitters",
        content: "L-theanine is an amino acid found almost exclusively in tea leaves (Camellia sinensis). It crosses the blood-brain barrier within 30-40 minutes of ingestion and increases alpha brain wave activity — the frequency associated with calm, focused attention (as opposed to beta waves, associated with anxious rumination). L-theanine achieves this by modulating GABA, serotonin, and dopamine levels in the brain without causing sedation. EEG studies confirm that 200mg L-theanine increases alpha wave production within 40 minutes, and this effect persists for 4-6 hours. This is why green tea produces a different kind of alertness than coffee — focused and calm rather than wired and anxious."
      },
      {
        heading: "EGCG: The Neuroprotective Powerhouse",
        content: "Epigallocatechin-3-gallate (EGCG) is the most abundant and most potent catechin in green tea. It provides neuroprotection through three mechanisms particularly relevant to cadmium recovery: (1) It chelates iron and copper ions, preventing them from catalyzing free radical reactions in the brain. (2) It activates the Nrf2 pathway, upregulating the brain's own antioxidant defense systems (including glutathione — which cadmium depletes). (3) It inhibits the aggregation of misfolded proteins that accumulate during neurotoxic exposure. A 2013 study in Molecular Nutrition & Food Research demonstrated that EGCG supplementation increased working memory performance and increased brain connectivity between frontal and parietal regions as measured by fMRI."
      },
      {
        heading: "The Synergistic Effect",
        content: "L-theanine and EGCG produce effects together that neither achieves alone. L-theanine increases attention and processing speed while reducing anxiety; EGCG provides the neuroprotective umbrella under which neural repair can occur more efficiently. The CogniCare protocol positions green tea at Step 4 (3:00 PM, Brain Exercise phase) because this timing capitalizes on the natural afternoon cortisol dip — L-theanine's calming focus counteracts the typical post-lunch cognitive slump while EGCG provides antioxidant protection during the protocol's brain exercise component."
      },
      {
        heading: "Brewing for Maximum Benefit",
        content: "Preparation method dramatically affects the bioactive compound content of green tea. For optimal L-theanine and EGCG extraction: use water at 70-80\u00B0C (not boiling — high temperatures destroy L-theanine and increase bitter tannin extraction), steep for 2-3 minutes (longer steeping increases caffeine without proportionally increasing beneficial compounds), use loose leaf over bags (larger leaf surface area means better compound extraction), and choose shade-grown varieties when possible (shade-growing increases L-theanine content by 50-100%). Two to three cups of properly brewed green tea provide approximately 100-200mg L-theanine and 200-300mg EGCG."
      }
    ],
    references: [
      "Nobre AC, et al. L-theanine, a natural constituent in tea, and its effect on mental state. Asia Pac J Clin Nutr. 2008;17(S1):167-168.",
      "Scholey A, et al. Acute neurocognitive effects of epigallocatechin gallate. Mol Nutr Food Res. 2012;56(2):324-330.",
      "Kakuda T. Neuroprotective effects of theanine and its preventive effects on cognitive dysfunction. Pharmacol Res. 2011;64(2):162-168.",
      "Singh NA, et al. Potential neuroprotective properties of epigallocatechin-3-gallate. Nutr J. 2016;15(1):60."
    ],
    tier: "protocol"
  }
];

// ─── VIDEO LESSONS (Circle tier) ──────────────────────────────────────────────

export interface VideoLesson {
  id: string;
  title: string;
  duration: string;
  description: string;
  module: number;
}

export const VIDEO_LESSONS: VideoLesson[] = [
  {
    id: "vl1",
    title: "Understanding Cadmium Neurotoxicity",
    duration: "18 min",
    description: "A complete visual explanation of how cadmium enters the brain, damages neural tissue, and produces the symptoms you experience. Includes 3D brain models showing affected regions and the chelation process in action.",
    module: 1,
  },
  {
    id: "vl2",
    title: "The Chelation Process Explained",
    duration: "22 min",
    description: "Follow the journey of a cadmium ion from tissue storage to elimination. Understand why the Morning Cleanse Tonic works, what happens during the mobilization phase, and how to recognize signs of effective detoxification.",
    module: 2,
  },
  {
    id: "vl3",
    title: "Optimizing Your Neural Recovery",
    duration: "15 min",
    description: "Advanced strategies for maximizing protocol effectiveness: timing optimization, food pairing for absorption, sleep architecture improvements, and lifestyle modifications that accelerate cognitive recovery by 40%.",
    module: 3,
  },
  {
    id: "vl4",
    title: "Advanced Supplementation Strategies",
    duration: "20 min",
    description: "Deep dive into the science of each protocol compound: optimal forms, absorption enhancers, interaction effects, and how to adjust dosages based on your Week 4 assessment results.",
    module: 4,
  },
  {
    id: "vl5",
    title: "Reading Your Body's Signals",
    duration: "12 min",
    description: "Learn to distinguish between normal detox symptoms and signals that need attention. Covers the 7 key indicators of protocol progress, when to adjust timing, and what each physical sensation means for your recovery.",
    module: 5,
  },
  {
    id: "vl6",
    title: "Long-Term Brain Maintenance",
    duration: "25 min",
    description: "Post-protocol maintenance strategies: the simplified 3-day/week schedule, environmental protection measures, annual re-assessment protocol, and dietary guidelines for permanent cognitive health.",
    module: 6,
  },
];