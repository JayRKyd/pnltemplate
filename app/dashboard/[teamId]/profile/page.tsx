"use client";

import { ProfilePage } from "@/testcode/profilepage";
import { useRouter } from "next/navigation";

export default function ProfileRoute() {
  const router = useRouter();

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Profile</h2>
          <p className="text-sm text-muted-foreground">Mock profile layout.</p>
        </div>
      </div>
      <div className="rounded-lg border bg-white/50 dark:bg-black/30 p-4">
        <ProfilePage onBack={() => router.back()} />
      </div>
    </div>
  );
}
"use client";

import { useRouter, useParams } from "next/navigation";
import { ProfilePage } from "@/testcode/profilepage";

export default function ProfileRoute() {
  const router = useRouter();
  const params = useParams<{ teamId: string }>();

  return (
    <div className="p-6 md:p-8">
      <ProfilePage onBack={() => router.push(`/dashboard/${params.teamId}`)} />
    </div>
  );
}
