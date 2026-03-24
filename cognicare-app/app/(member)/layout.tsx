import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserProvider } from "@/components/providers/UserProvider";
import Sidebar from "@/components/layout/Sidebar";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.onboarding_complete) {
    redirect("/onboarding");
  }

  return (
    <UserProvider profile={profile}>
      <div className="min-h-screen bg-surface-950">
        <Sidebar />
        <main className="md:ml-[260px] min-h-screen">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
            {children}
          </div>
        </main>
      </div>
    </UserProvider>
  );
}
