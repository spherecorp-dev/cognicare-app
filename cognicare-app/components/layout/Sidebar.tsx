"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Zap,
  Users,
  Crown,
  ChefHat,
  TrendingUp,
  User,
  LogOut,
  Menu,
  X,
  Brain,
  ChevronRight,
  FlaskConical,
  ClipboardCheck,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Daily Protocol", href: "/protocolo", icon: BookOpen, tier: "protocol" as const },
  { name: "Neural Accelerator", href: "/acelerador", icon: Zap, tier: "accelerator" as const },
  { name: "Family Protocol", href: "/familia", icon: Users, tier: "family" as const },
  { name: "Protection Circle", href: "/circle", icon: Crown, tier: "circle" as const },
  { name: "Brain Recipes", href: "/receitas", icon: ChefHat },
  { name: "Science Library", href: "/ciencia", icon: FlaskConical },
  { name: "Assessments", href: "/avaliacoes", icon: ClipboardCheck },
  { name: "My Progress", href: "/progresso", icon: TrendingUp },
];

const tierBadge: Record<string, { label: string; color: string }> = {
  protocol: { label: "Core", color: "bg-brand-600/20 text-brand-400" },
  accelerator: { label: "OC1", color: "bg-amber-600/20 text-amber-400" },
  family: { label: "OC2", color: "bg-blue-600/20 text-blue-400" },
  circle: { label: "VIP", color: "bg-purple-600/20 text-purple-400" },
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg glass md:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-300 glass",
          collapsed ? "w-[72px]" : "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-700/50">
          <div className={cn("flex items-center gap-3", collapsed && "justify-center w-full")}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-bold text-sm text-white">CogniCare</h1>
                <p className="text-[10px] text-surface-400">Member Area</p>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setCollapsed(!collapsed);
              setMobileOpen(false);
            }}
            className="p-1 rounded hover:bg-surface-700/50 hidden md:block"
          >
            <ChevronRight
              className={cn(
                "w-4 h-4 text-surface-400 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </button>

          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded hover:bg-surface-700/50 md:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group",
                  isActive
                    ? "bg-brand-600/20 text-brand-400"
                    : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/60"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0",
                    isActive ? "text-brand-400" : "text-surface-500 group-hover:text-surface-300"
                  )}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.tier && tierBadge[item.tier] && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                          tierBadge[item.tier].color
                        )}
                      >
                        {tierBadge[item.tier].label}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-surface-700/50 space-y-1">
          <Link
            href="/perfil"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-surface-400 hover:text-surface-200 hover:bg-surface-800/60 transition-all",
              pathname === "/perfil" && "bg-brand-600/20 text-brand-400"
            )}
          >
            <User className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>My Profile</span>}
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-surface-400 hover:text-red-400 hover:bg-red-950/30 transition-all w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
