import { Metadata } from "next";
import { TeamProjects } from "@/components/team-projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "Team-scoped Supabase data example.",
};

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  return (
    <div className="p-8 space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">Projects</h2>
        <p className="text-sm text-muted-foreground">
          Data fetched from Supabase filtered by the active team.
        </p>
      </div>
      <TeamProjects teamId={teamId} />
    </div>
  );
}
