"use client";

import { useState } from "react";
import { RECIPES } from "@/lib/data";
import { useProgress } from "@/lib/useProgress";
import { useUser } from "@/components/providers/UserProvider";
import { cn } from "@/lib/utils";
import {
  ChefHat,
  Clock,
  Filter,
  Beaker,
  ChevronDown,
  CheckCircle2,
  Heart,
  Sunrise,
} from "lucide-react";

type FilterType = "all" | "protocol" | "accelerator" | "family";

const filterOptions: { value: FilterType; label: string; color: string }[] = [
  { value: "all", label: "All Recipes", color: "bg-surface-700/50 text-surface-300" },
  { value: "protocol", label: "Core", color: "bg-brand-600/20 text-brand-400" },
  { value: "accelerator", label: "Accelerator", color: "bg-amber-600/20 text-amber-400" },
  { value: "family", label: "Family", color: "bg-blue-600/20 text-blue-400" },
];

const tierLabel: Record<string, string> = {
  protocol: "Core Protocol",
  accelerator: "Accelerator",
  family: "Family",
};

const tierColor: Record<string, string> = {
  protocol: "bg-brand-600/20 text-brand-400",
  accelerator: "bg-amber-600/20 text-amber-400",
  family: "bg-blue-600/20 text-blue-400",
};

export default function ReceitasPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { userId } = useUser();
  const progress = useProgress(userId, 1);

  const filtered =
    filter === "all" ? RECIPES : RECIPES.filter((r) => r.tier === filter);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700">
          <ChefHat className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Brain Recipes</h1>
          <p className="text-surface-400 mt-1">
            Preparations that incorporate the protocol compounds into everyday foods — each one
            targets a specific cognitive pathway
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-surface-500" />
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              filter === opt.value
                ? opt.color
                : "bg-surface-800/50 text-surface-500 hover:text-surface-300"
            )}
          >
            {opt.label}
          </button>
        ))}
        <span className="text-xs text-surface-500 ml-2">
          {filtered.length} recipe{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Recipe Cards */}
      <div className="space-y-4">
        {filtered.map((recipe) => {
          const isExpanded = expandedId === recipe.id;
          const isPrepared = progress.isRecipePrepared(recipe.id);

          return (
            <div key={recipe.id} className="glass rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                className="w-full p-5 flex items-start gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600/20 to-amber-600/20 flex items-center justify-center flex-shrink-0 text-2xl">
                  {recipe.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white text-sm">
                      {recipe.title}
                    </h3>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full",
                        tierColor[recipe.tier]
                      )}
                    >
                      {tierLabel[recipe.tier]}
                    </span>
                    {isPrepared && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-600/20 text-green-400">
                        Prepared
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <span className="text-xs text-surface-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {recipe.time}
                    </span>
                    <span className="text-xs text-surface-400 flex items-center gap-1">
                      <Beaker className="w-3 h-3" /> {recipe.compound}
                    </span>
                    <span className="text-xs text-surface-400 flex items-center gap-1">
                      <Sunrise className="w-3 h-3" /> {recipe.bestTime}
                    </span>
                  </div>
                  <p className="text-[11px] text-surface-500 mt-1.5">{recipe.benefit}</p>
                </div>

                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-surface-500 transition-transform flex-shrink-0",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-surface-700/30 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Ingredients */}
                    <div>
                      <h4 className="text-sm font-semibold text-surface-300 mb-3">
                        Ingredients
                      </h4>
                      <ul className="space-y-2">
                        {recipe.ingredients.map((ing, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-sm text-surface-400"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                            {ing}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Instructions */}
                    <div>
                      <h4 className="text-sm font-semibold text-surface-300 mb-3">
                        Instructions
                      </h4>
                      <ol className="space-y-2">
                        {recipe.instructions.map((step, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-surface-400"
                          >
                            <span className="w-5 h-5 rounded-full bg-surface-700/50 flex items-center justify-center text-xs text-surface-500 flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center gap-4 mt-4 flex-wrap">
                    <span className="text-xs text-surface-500 flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {recipe.benefit}
                    </span>
                  </div>

                  <button
                    onClick={() => progress.toggleRecipe(recipe.id)}
                    className={cn(
                      "mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors",
                      isPrepared
                        ? "bg-green-600/20 text-green-400 hover:bg-green-600/30"
                        : "bg-brand-600/20 text-brand-400 hover:bg-brand-600/30"
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isPrepared ? "Prepared!" : "Mark as Prepared"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
