"use client";

import { useState } from "react";
import { useUser } from "@/components/providers/UserProvider";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Mail,
  Calendar,
  Shield,
  Package,
  CheckCircle2,
  CreditCard,
  Pencil,
} from "lucide-react";

const tierInfo: Record<string, { name: string; price: string; color: string }> = {
  protocol: { name: "CogniCare Protocol", price: "$97", color: "bg-brand-600/20 text-brand-400" },
  accelerator: { name: "Neural Accelerator", price: "$47", color: "bg-amber-600/20 text-amber-400" },
  family: { name: "Family Protocol", price: "$97", color: "bg-blue-600/20 text-blue-400" },
  circle: { name: "Family Protection Circle", price: "$37/mo", color: "bg-purple-600/20 text-purple-400" },
};

export default function PerfilPage() {
  const { profile } = useUser();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.full_name || "");
  const [baseline, setBaseline] = useState(profile.brain_fog_baseline || 5);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ full_name: name, brain_fog_baseline: baseline })
      .eq("id", profile.id);
    setSaving(false);
    setEditing(false);
  };

  const memberSince = profile.start_date
    ? new Date(profile.start_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-surface-600 to-surface-800">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
          <p className="text-surface-400 mt-1">Manage your account and subscriptions</p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">
            Personal Information
          </h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-700/50 text-surface-300 text-xs hover:bg-surface-700/70 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/40">
            <User className="w-4 h-4 text-surface-500" />
            <div className="flex-1">
              <p className="text-xs text-surface-500">Name</p>
              {editing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-surface-900/60 border border-surface-600/50 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                />
              ) : (
                <p className="text-sm text-white">{profile.full_name || "—"}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/40">
            <Mail className="w-4 h-4 text-surface-500" />
            <div>
              <p className="text-xs text-surface-500">Email</p>
              <p className="text-sm text-white">{profile.email || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/40">
            <Calendar className="w-4 h-4 text-surface-500" />
            <div>
              <p className="text-xs text-surface-500">Member since</p>
              <p className="text-sm text-white">{memberSince}</p>
            </div>
          </div>
          {editing && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-800/40">
              <div className="flex-1">
                <p className="text-xs text-surface-500 mb-2">Brain Fog Baseline (1-10)</p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={baseline}
                    onChange={(e) => setBaseline(Number(e.target.value))}
                    className="flex-1 accent-brand-500"
                  />
                  <span className="text-sm font-medium text-white w-6 text-center">{baseline}</span>
                </div>
              </div>
            </div>
          )}
          {editing && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-medium hover:bg-brand-500 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setName(profile.full_name || "");
                  setBaseline(profile.brain_fog_baseline || 5);
                }}
                className="px-4 py-2 rounded-xl bg-surface-700/50 text-surface-300 text-xs hover:bg-surface-700/70 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Products */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Package className="w-4 h-4" /> Your Products
        </h2>
        <div className="space-y-3">
          {(profile.purchased_tiers || ["protocol"]).map((tier) => {
            const info = tierInfo[tier];
            if (!info) return null;
            return (
              <div
                key={tier}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/40"
              >
                <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-white">{info.name}</p>
                  <p className="text-xs text-surface-500">{info.price}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${info.color}`}>
                  Active
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Guarantee */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-brand-400 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-white">60-Day Guarantee</h3>
            <p className="text-xs text-surface-400 mt-1">
              Your guarantee is active. 100% refund, no questions asked.
            </p>
          </div>
        </div>
      </div>

      {/* Billing */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4" /> Billing
        </h2>
        <div className="p-3 rounded-xl bg-surface-800/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Family Protection Circle</p>
              <p className="text-xs text-surface-500">Subscription active</p>
            </div>
            <span className="text-sm font-medium text-purple-400">$37/mo</span>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button className="px-4 py-2 rounded-xl bg-surface-700/50 text-surface-300 text-xs hover:bg-surface-700/70 transition-colors">
            Update Payment
          </button>
          <button className="px-4 py-2 rounded-xl text-red-400/60 text-xs hover:text-red-400 hover:bg-red-950/30 transition-colors">
            Cancel Subscription
          </button>
        </div>
      </div>
    </div>
  );
}
