"use client";

import { useState } from "react";
import { SCIENCE_ARTICLES, ScienceArticle } from "@/lib/data";
import { useUser } from "@/components/providers/UserProvider";
import {
  FlaskConical,
  BookOpen,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const categoryColors: Record<string, string> = {
  Neurotoxicology: "bg-red-600/20 text-red-400 border-red-800/30",
  Nootropics: "bg-brand-600/20 text-brand-400 border-brand-800/30",
  Neurogenesis: "bg-purple-600/20 text-purple-400 border-purple-800/30",
  "Mineral Neuroscience": "bg-blue-600/20 text-blue-400 border-blue-800/30",
  "Chelation Science": "bg-amber-600/20 text-amber-400 border-amber-800/30",
  "Nutritional Neuroscience": "bg-teal-600/20 text-teal-400 border-teal-800/30",
  "Gut-Brain Axis": "bg-orange-600/20 text-orange-400 border-orange-800/30",
  Chronobiology: "bg-indigo-600/20 text-indigo-400 border-indigo-800/30",
};

export default function CienciaPage() {
  const { profile } = useUser();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleArticle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400">
          <FlaskConical className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Science Library</h1>
          <p className="text-surface-400 mt-0.5">
            Evidence-based research behind every protocol ingredient
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="glass rounded-2xl p-4 flex items-center justify-around">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand-400" />
          <span className="text-sm text-surface-300 font-medium">
            {SCIENCE_ARTICLES.length} Articles
          </span>
        </div>
        <div className="w-px h-5 bg-surface-700" />
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-surface-300 font-medium">
            Peer-Reviewed Sources
          </span>
        </div>
        <div className="w-px h-5 bg-surface-700" />
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-surface-400" />
          <span className="text-sm text-surface-300 font-medium">
            Updated Monthly
          </span>
        </div>
      </div>

      {/* Article List */}
      <div className="space-y-4">
        {SCIENCE_ARTICLES.map((article: ScienceArticle) => {
          const isExpanded = expandedId === article.id;
          const colorClass =
            categoryColors[article.category] ||
            "bg-surface-700/30 text-surface-300 border-surface-600/30";

          return (
            <div
              key={article.id}
              className={cn(
                "glass rounded-2xl overflow-hidden transition-all",
                isExpanded && "glow-brand"
              )}
            >
              {/* Collapsed Header */}
              <button
                onClick={() => toggleArticle(article.id)}
                className="w-full p-5 text-left flex items-start gap-4 hover:bg-surface-800/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span
                      className={cn(
                        "text-xs px-2.5 py-0.5 rounded-full border font-medium",
                        colorClass
                      )}
                    >
                      {article.category}
                    </span>
                    {article.tier === "circle" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-800/30 font-medium">
                        VIP
                      </span>
                    )}
                    <span className="text-xs text-surface-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.readTime}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white leading-snug">
                    {article.title}
                  </h3>
                  <p className="text-sm text-surface-400 mt-1.5 line-clamp-2">
                    {article.summary}
                  </p>
                </div>
                <div className="flex-shrink-0 mt-1">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-surface-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-surface-500" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-5 pb-6 border-t border-surface-700/50">
                  {/* Sections */}
                  <div className="mt-5 space-y-6">
                    {article.sections.map((section, idx) => (
                      <div key={idx}>
                        <h4 className="text-sm font-semibold text-brand-400 mb-2">
                          {section.heading}
                        </h4>
                        <p className="text-sm text-surface-300 leading-relaxed">
                          {section.content}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* References */}
                  {article.references.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-surface-800/50">
                      <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
                        References
                      </h4>
                      <ol className="space-y-1.5">
                        {article.references.map((ref, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-surface-500 leading-relaxed pl-4 relative"
                          >
                            <span className="absolute left-0 text-surface-600">
                              {idx + 1}.
                            </span>
                            {ref}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
