import {
  LucideIcon,
  LayoutDashboard,
  Briefcase,
  BarChart3,
  CalendarDays,
  MessageSquare,
  Settings,
} from "lucide-react";

import { ViewType } from "../../types";

export interface NavItem {
  view: ViewType;
  icon: LucideIcon;
  /** Label shown in the sidebar. */
  label: string;
  /** Shorter label for the mobile bottom bar. */
  shortLabel: string;
  /** Whether this item carries the unread-message badge. */
  showsUnreadBadge?: boolean;
}

const DASHBOARD: NavItem = { view: "dashboard", icon: LayoutDashboard, label: "Dashboard", shortLabel: "Home" };
const APPLICATIONS: NavItem = { view: "applications", icon: Briefcase, label: "Applications", shortLabel: "Apps" };
const ANALYTICS: NavItem = { view: "analytics", icon: BarChart3, label: "Analytics", shortLabel: "Stats" };
const CALENDAR: NavItem = { view: "calendar", icon: CalendarDays, label: "Calendar", shortLabel: "Calendar" };
const MESSAGES: NavItem = { view: "messages", icon: MessageSquare, label: "Messages", shortLabel: "Messages", showsUnreadBadge: true };
const SETTINGS: NavItem = { view: "settings", icon: Settings, label: "Settings", shortLabel: "Settings" };

export const SIDEBAR_NAV: NavItem[] = [
  DASHBOARD,
  APPLICATIONS,
  ANALYTICS,
  CALENDAR,
  MESSAGES,
  SETTINGS,
];

// Keep the main mobile destinations spacious; secondary pages live under More.
export const MOBILE_NAV: NavItem[] = [
  DASHBOARD,
  APPLICATIONS,
  CALENDAR,
  MESSAGES,
];

export const MOBILE_MORE_NAV: NavItem[] = [
  ANALYTICS,
  SETTINGS,
];
