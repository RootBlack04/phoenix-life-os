export interface NavItem {
  label: string;
  href: string;
  icon:
    | "LayoutDashboard"
    | "MessageCircle"
    | "Code2"
    | "Briefcase"
    | "CircleDollarSign"
    | "HeartPulse"
    | "BrainCircuit"
    | "CheckSquare"
    | "BookOpen"
    | "StickyNote"
    | "Settings";
}

export const navItems: NavItem[] = [
  { label: "Overview", href: "/", icon: "LayoutDashboard" },
  { label: "Languages", href: "/languages", icon: "MessageCircle" },
  { label: "Engineering", href: "/engineering", icon: "Code2" },
  { label: "Career", href: "/career", icon: "Briefcase" },
  { label: "Income", href: "/income", icon: "CircleDollarSign" },
  { label: "Health", href: "/health", icon: "HeartPulse" },
  { label: "Mindset", href: "/mindset", icon: "BrainCircuit" },
  { label: "Habits", href: "/habits", icon: "CheckSquare" },
  { label: "Resources", href: "/resources", icon: "BookOpen" },
  { label: "Notes", href: "/notes", icon: "StickyNote" },
];

export const settingsItem: NavItem = { label: "Settings", href: "/settings", icon: "Settings" };
