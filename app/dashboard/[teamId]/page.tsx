import { redirect } from "next/navigation";

export default function DashboardIndex({
  params,
}: {
  params: { teamId: string };
}) {
  redirect(`/dashboard/${params.teamId}/expenses`);
}
