"use client";

import { createContext, useContext } from "react";
import type { Profile } from "@/lib/supabase/types";

interface UserContextValue {
  profile: Profile;
  userId: string;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return (
    <UserContext.Provider value={{ profile, userId: profile.id }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return ctx;
}
