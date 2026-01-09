"use client";

import { CompanySettingsPage } from "@/testcode/companysettingspage";
import { useRouter } from "next/navigation";

export default function ConfigurationPage() {
  const router = useRouter();

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuration</h2>
          <p className="text-sm text-muted-foreground">Company settings (mock).</p>
        </div>
      </div>
      <div className="rounded-lg border bg-white/50 dark:bg-black/30 p-4">
        <CompanySettingsPage onBack={() => router.back()} />
      </div>
    </div>
  );
}
