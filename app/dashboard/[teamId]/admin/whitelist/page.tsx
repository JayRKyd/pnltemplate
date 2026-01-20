"use client";

import { useParams } from "next/navigation";
import { WhitelistManagement } from "@/components/admin/whitelist-management";

export default function WhitelistPage() {
  const params = useParams<{ teamId: string }>();

  return (
    <div className="p-6 md:p-8">
      <WhitelistManagement teamId={params.teamId} />
    </div>
  );
}
