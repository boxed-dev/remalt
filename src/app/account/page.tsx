"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
// import { AppHeader } from "@/components/layout/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  current_period_end: string;
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccountData = async () => {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error fetching user:", userError.message);
        setLoading(false);
        return;
      }

      if (user) {
        setUser(user);

        const { data: subscriptionData, error: subError } = await supabase
          .from("subscriptions")
          .select("id, plan, status, current_period_end")
          .eq("user_id", user.id)
          .single();

        if (!subError) setSubscription(subscriptionData);
      }

      setLoading(false);
    };

    fetchAccountData();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-[#6B7280] text-sm animate-pulse">
        Loading account details...
      </div>
    );

  if (!user)
    return (
      <div className="flex items-center justify-center min-h-screen text-center text-red-500">
        You’re not logged in.{" "}
        <a href="/login" className="underline ml-1">
          Go to login →
        </a>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col">
      {/* <AppHeader /> */}
      <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mx-auto space-y-6"
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", system-ui, sans-serif',
          }}
        >
          <div className="space-y-2">
            <h1 className="text-[32px] font-semibold text-[#1A1D21]">
              Account Settings
            </h1>
            <p className="text-[15px] text-[#6B7280]">
              Manage your account settings and subscription
            </p>
          </div>

          {/* Profile Info */}
          <Card className="border-[#E8ECEF] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="text-[18px] font-semibold text-[#1A1D21]">
                Profile Information
              </CardTitle>
              <CardDescription className="text-[14px] text-[#6B7280]">
                Your personal details and account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <div className="text-[13px] font-medium text-[#6B7280]">Email</div>
                <div className="text-[14px] text-[#1A1D21]">{user.email}</div>
              </div>
              <div className="grid gap-2">
                <div className="text-[13px] font-medium text-[#6B7280]">User ID</div>
                <div className="text-[13px] font-mono text-[#6B7280]">{user.id}</div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Info */}
          <Card className="border-[#E8ECEF] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="text-[18px] font-semibold text-[#1A1D21]">
                Subscription
              </CardTitle>
              <CardDescription className="text-[14px] text-[#6B7280]">
                Your active plan and renewal details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-2 text-[14px]">
                  <p>
                    <span className="font-medium text-[#6B7280]">Plan: </span>
                    <span className="text-[#1A1D21]">{subscription.plan}</span>
                  </p>
                  <p>
                    <span className="font-medium text-[#6B7280]">Status: </span>
                    <span
                      className={`${
                        subscription.status === "active"
                          ? "text-[#34C759]"
                          : "text-[#EAB308]"
                      } font-medium`}
                    >
                      {subscription.status}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium text-[#6B7280]">Next Renewal: </span>
                    <span className="text-[#1A1D21]">
                      {new Date(subscription.current_period_end).toLocaleDateString()}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="text-[#6B7280] italic text-[14px]">
                  No active subscription found.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full sm:w-auto bg-[#EF4444] text-white text-[14px] font-medium py-2.5 px-6 rounded-xl hover:bg-[#DC2626] transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
