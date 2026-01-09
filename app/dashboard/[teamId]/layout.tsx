'use client';

import SidebarLayout, { SidebarItem } from "@/components/sidebar-layout";
import { SelectedTeamSwitcher, useUser } from "@stackframe/stack";
import {
  BarChart4,
  FileBarChart,
  FilePlus,
  FolderTree,
  Globe,
  Layers,
  LineChart,
  Receipt,
  Settings2,
  UserSquare2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { UpsertUserOnMount } from "./layout.client";

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
];

export default function Layout(props: { children: React.ReactNode }) {
  const params = useParams<{ teamId: string }>();
  const user = useUser({ or: 'redirect' });
  const team = user.useTeam(params.teamId);
  const router = useRouter();

  if (!team) {
    router.push('/dashboard');
    return null;
  }

  return (
    <SidebarLayout 
      items={navigationItems}
      basePath={`/dashboard/${team.id}`}
      sidebarTop={<SelectedTeamSwitcher 
        selectedTeam={team}
        urlMap={(team) => `/dashboard/${team.id}`}
      />}
      baseBreadcrumb={[{
        title: team.displayName,
        href: `/dashboard/${team.id}`,
      }]}
    >
      <UpsertUserOnMount />
      {props.children}
    </SidebarLayout>
  );
}