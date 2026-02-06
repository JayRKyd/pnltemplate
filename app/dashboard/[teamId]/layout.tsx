'use client';

import SidebarLayout, { SidebarItem } from "@/components/sidebar-layout";
import { useUser } from "@stackframe/stack";
import {
  BarChart4,
  Building2,
  FileBarChart,
  FilePlus,
  FolderTree,
  Globe,
  Layers,
  LineChart,
  Receipt,
  Settings2,
  Shield,
  UserSquare2,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { UpsertUserOnMount } from "./layout.client";
import { useState, useEffect } from "react";
import { isCompanyAdmin } from "@/app/actions/permissions";
import { getCompanyByTeamId } from "@/app/actions/companies";

export default function Layout(props: { children: React.ReactNode }) {
  const params = useParams<{ teamId: string }>();
  const user = useUser({ or: 'redirect' });
  const team = user.useTeam(params.teamId);
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Check if user is admin for this team and get company ID
  useEffect(() => {
    async function checkRole() {
      try {
        const adminStatus = await isCompanyAdmin(params.teamId);
        setIsAdmin(adminStatus);

        // Get company ID for this team
        const company = await getCompanyByTeamId(params.teamId);
        if (company) {
          setCompanyId(company.id);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      } finally {
        setLoading(false);
      }
    }

    checkRole();
  }, [params.teamId]);

  if (!team) {
    router.push('/dashboard');
    return null;
  }

  // Build navigation items based on role
  const navigationItems: SidebarItem[] = [
    { type: "label", name: "Spending" },
    {
      name: "Expenses",
      href: "/expenses",
      icon: Receipt,
      type: "item",
    },
    {
      name: "New Expense",
      href: "/expenses/new",
      icon: FilePlus,
      type: "item",
    },
    { type: "label", name: "Financials" },
    {
      name: "Budget",
      href: "/budget",
      icon: Layers,
      type: "item",
    },
    {
      name: "P&L",
      href: "/pnl",
      icon: FileBarChart,
      type: "item",
    },
    {
      name: "Delta",
      href: "/delta",
      icon: LineChart,
      type: "item",
    },
    {
      name: "Categories",
      href: "/categories/1.%20Echipa",
      icon: FolderTree,
      type: "item",
    },
    // Company Management - All users can view, admins can edit
    ...(companyId ? [
      { type: "label" as const, name: "Company" },
      {
        name: "Company",
        href: `/companies/${companyId}`,
        icon: Building2,
        type: "item" as const,
      },
    ] : []),
    {
      type: 'label',
      name: 'Settings',
    },
    {
      name: "Configuration",
      href: "/configuration",
      icon: Settings2,
      type: "item",
    },
    {
      name: "Profile",
      href: "/profile",
      icon: UserSquare2,
      type: "item",
    },
    {
      name: "Team Members",
      href: "/team",
      icon: Users,
      type: "item",
    },
  ];

  return (
    <SidebarLayout
      items={navigationItems}
      basePath={`/dashboard/${team.id}`}
      baseBreadcrumb={[{
        title: team.displayName,
        href: `/dashboard/${team.id}`,
      }]}
      currentTeam={team}
      hideSidebar={true}
    >
      <UpsertUserOnMount />
      {props.children}
    </SidebarLayout>
  );
}