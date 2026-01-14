import { redirect } from "next/navigation";

export default async function DashboardIndex({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  redirect(`/dashboard/${teamId}/expenses`);
}
