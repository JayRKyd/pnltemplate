"use client";

import { useEffect, useState } from "react";
import { fetchProjectsByTeam } from "@/lib/supabase-queries";

type Project = {
  id: string | number;
  name?: string;
  tenant_id?: string;
  created_at?: string;
};

export function TeamProjects({ teamId }: { teamId: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await fetchProjectsByTeam(teamId);
      if (!mounted) return;
      if (error) {
        setError(error.message);
      } else {
        setProjects(data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [teamId]);

  if (loading) return <p>Loading projects...</p>;
  if (error)
    return (
      <div className="text-sm text-red-600">
        Could not load projects: {error}. Ensure the `projects` table exists
        with a `tenant_id` column and RLS policies.
      </div>
    );

  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No projects found for this team yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => (
        <div
          key={project.id}
          className="rounded-md border p-3 flex items-center justify-between"
        >
          <div>
            <p className="font-medium">{project.name ?? `Project ${project.id}`}</p>
            <p className="text-xs text-muted-foreground">
              Tenant: {project.tenant_id ?? "n/a"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {project.created_at?.slice(0, 10)}
          </p>
        </div>
      ))}
    </div>
  );
}
