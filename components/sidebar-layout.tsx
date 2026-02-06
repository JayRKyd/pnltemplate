"use client";

import { cn } from "@/lib/utils";
import { UserDropdown } from "./user-dropdown";
import { LucideIcon, Menu, ChevronDown, Check } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { buttonVariants } from "./ui/button";
import { Separator } from "./ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useUser, Team } from "@stackframe/stack";

function useSegment(basePath: string) {
  const path = usePathname();
  const result = path.slice(basePath.length, path.length);
  return result ? result : "/";
}

type Item = {
  name: React.ReactNode;
  href: string;
  icon: LucideIcon;
  type: "item";
};

type Sep = {
  type: "separator";
};

type Label = {
  name: React.ReactNode;
  type: "label";
};

export type SidebarItem = Item | Sep | Label;

// Team Switcher Dropdown Component
function TeamSwitcherDropdown({ 
  currentTeam, 
  basePath 
}: { 
  currentTeam?: Team;
  basePath: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const user = useUser();
  const teams = user?.useTeams();
  const router = useRouter();

  const handleTeamSelect = (team: Team) => {
    router.push(`/dashboard/${team.id}`);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors bg-white"
      >
        <span className="text-sm font-medium text-gray-700">
          {currentTeam?.displayName || 'Select Team'}
        </span>
        <ChevronDown size={16} className={cn("text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Your Teams
            </div>
            {teams?.map((team) => (
              <button
                key={team.id}
                onClick={() => handleTeamSelect(team)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors",
                  team.id === currentTeam?.id ? "text-teal-600 bg-teal-50" : "text-gray-700"
                )}
              >
                <span className="font-medium">{team.displayName}</span>
                {team.id === currentTeam?.id && (
                  <Check size={16} className="text-teal-600" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Navigation Tabs Component
function NavTabs({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  
  // Determine active tab based on current path
  const isExpenses = pathname.includes('/expenses') || pathname.includes('/budget') || pathname.includes('/categories');
  const isPnl = pathname.includes('/pnl') || pathname.includes('/delta');
  
  const activeTab = isPnl ? 'pnl' : 'cheltuieli';

  return (
    <div className="flex items-center bg-gray-100 rounded-full p-1">
      <Link
        href={`${basePath}/expenses`}
        className={cn(
          "flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all",
          activeTab === 'cheltuieli'
            ? 'bg-teal-500 text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        {activeTab === 'cheltuieli' && <Check size={16} />}
        Cheltuieli
      </Link>
      <Link
        href={`${basePath}/pnl`}
        className={cn(
          "px-6 py-2 rounded-full text-sm font-medium transition-all",
          activeTab === 'pnl'
            ? 'bg-teal-500 text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        P&L
      </Link>
    </div>
  );
}

function NavItem(props: {
  item: Item;
  onClick?: () => void;
  basePath: string;
}) {
  const segment = useSegment(props.basePath);
  const selected = segment === props.item.href;

  // Check if href is an absolute path (starts with /)
  // If it starts with /companies or other absolute paths, use as-is
  // Otherwise, prepend basePath
  const isAbsolutePath = props.item.href.startsWith('/companies') ||
                         props.item.href.startsWith('/super-admin');
  const finalHref = isAbsolutePath ? props.item.href : props.basePath + props.item.href;

  return (
    <Link
      href={finalHref}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        selected && "bg-muted",
        "flex-grow justify-start text-md text-zinc-800 dark:text-zinc-300 px-2"
      )}
      onClick={props.onClick}
      prefetch={true}
    >
      <props.item.icon className="mr-2 h-5 w-5" />
      {props.item.name}
    </Link>
  );
}

function SidebarContent(props: {
  onNavigate?: () => void;
  items: SidebarItem[];
  sidebarTop?: React.ReactNode;
  basePath: string;
}) {
  const path = usePathname();
  const segment = useSegment(props.basePath);

  return (
    <div className="flex flex-col h-full items-stretch">
      {props.sidebarTop && (
      <div className="h-14 flex items-center px-2 shrink-0 mr-10 md:mr-0 border-b">
        {props.sidebarTop}
      </div>
      )}
      <div className="flex flex-grow flex-col gap-2 pt-4 overflow-y-auto">
        {props.items.map((item, index) => {
          if (item.type === "separator") {
            return <Separator key={index} className="my-2" />;
          } else if (item.type === "item") {
            return (
              <div key={index} className="flex px-2">
                <NavItem
                  item={item}
                  onClick={props.onNavigate}
                  basePath={props.basePath}
                />
              </div>
            );
          } else {
            return (
              <div key={index} className="flex my-2">
                <div className="flex-grow justify-start text-sm font-medium text-zinc-500 px-2">
                  {item.name}
                </div>
              </div>
            );
          }
        })}

        <div className="flex-grow" />
      </div>
    </div>
  );
}

export type HeaderBreadcrumbItem = { title: string; href: string };

function HeaderBreadcrumb(props: { items: SidebarItem[], baseBreadcrumb?: HeaderBreadcrumbItem[], basePath: string }) {
  const segment = useSegment(props.basePath);
  console.log(segment)
  const item = props.items.find((item) => item.type === 'item' && item.href === segment);
  const title: string | undefined = (item as any)?.name

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {props.baseBreadcrumb?.map((item, index) => (
          <Fragment key={item.href ?? index}>
            <BreadcrumbItem>
              <BreadcrumbLink href={item.href}>{item.title}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </Fragment>
        ))}

        <BreadcrumbItem>
          <BreadcrumbPage>{title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default function SidebarLayout(props: {
  children?: React.ReactNode;
  baseBreadcrumb?: HeaderBreadcrumbItem[];
  items: SidebarItem[];
  sidebarTop?: React.ReactNode;
  basePath: string;
  currentTeam?: Team;
  hideSidebar?: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* Top Navbar */}
      <div className="w-full bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left - Team Dropdown */}
          <TeamSwitcherDropdown currentTeam={props.currentTeam} basePath={props.basePath} />

          {/* Center - Tab Switcher */}
          <NavTabs basePath={props.basePath} />

          {/* Right - Menu & Avatar */}
          <div className="flex items-center gap-4">
            {/* Mobile menu - only show if sidebar is not hidden */}
            {!props.hideSidebar && (
              <div className="flex md:hidden">
            <Sheet
              onOpenChange={(open) => setSidebarOpen(open)}
              open={sidebarOpen}
            >
              <SheetTrigger>
                    <div className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <Menu size={20} className="text-gray-500" />
                    </div>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px] p-0">
                <SidebarContent
                  onNavigate={() => setSidebarOpen(false)}
                  items={props.items}
                  sidebarTop={props.sidebarTop}
                  basePath={props.basePath}
                />
              </SheetContent>
            </Sheet>
            </div>
            )}

          <UserDropdown
            colorModeToggle={() =>
              setTheme(resolvedTheme === "light" ? "dark" : "light")
            }
            teamId={props.currentTeam?.id}
          />
        </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Sidebar - only show if not hidden */}
        {!props.hideSidebar && (
          <div className="flex-col border-r w-[240px] h-[calc(100vh-57px)] sticky top-[57px] hidden md:flex">
            <SidebarContent items={props.items} sidebarTop={props.sidebarTop} basePath={props.basePath} />
          </div>
        )}
        
        {/* Content */}
        <div className="flex flex-col flex-grow w-0">
        <div className="flex-grow">{props.children}</div>
        </div>
      </div>
    </div>
  );
}
