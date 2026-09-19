import {
  AlertTriangle,
  Bot,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  Link2,
  type LucideIcon,
  ScanLine,
  Upload,
} from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Wafer Yield Analysis",
    items: [
      {
        id: "overview",
        title: "Overview",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      {
        id: "lots",
        title: "Wafer Lots",
        url: "/dashboard/lots",
        icon: Gauge,
      },
      {
        id: "risk",
        title: "Risk Watch",
        url: "/dashboard/risk",
        icon: AlertTriangle,
      },
      {
        id: "check",
        title: "Check Batch",
        url: "/dashboard/check",
        icon: FlaskConical,
      },
      {
        id: "defect-image",
        title: "Defect Patterns",
        url: "/dashboard/defect-image",
        icon: ScanLine,
      },
      {
        id: "patterns",
        title: "Sensor ↔ Defect",
        url: "/dashboard/patterns",
        icon: Link2,
      },
      {
        id: "assistant",
        title: "Ask Bob",
        url: "/dashboard/assistant",
        icon: Bot,
      },
      {
        id: "import",
        title: "Import Dataset",
        url: "/dashboard/import",
        icon: Upload,
      },
    ],
  },
];
