import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Layers,
  GraduationCap,
  DollarSign,
  BarChart3,
  FileText,
  Settings,
  Shield,
  Activity
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();

  const menuSections = [
    {
      title: "Overview",
      items: [
        {
          name: "Dashboard",
          path: "/admin/dashboard",
          icon: LayoutDashboard,
        },
        {
          name: "Analytics",
          path: "/admin/analytics",
          icon: BarChart3,
        },
      ],
    },

    {
      title: "Management",
      items: [
        {
          name: "Users",
          path: "/admin/users",
          icon: Users,
        },
        {
          name: "Groups",
          path: "/admin/groups",
          icon: Layers,
        },
        {
          name: "Programs",
          path: "/admin/programs",
          icon: GraduationCap,
        },
        {
          name: "Contributions",
          path: "/admin/revenue",
          icon: DollarSign,
        },
        {
          name: "Reports",
          path: "/admin/reports",
          icon: FileText,
        },
      ],
    },

    {
      title: "System",
      items: [
        {
          name: "Security",
          path: "/admin/security",
          icon: Shield,
        },
        {
          name: "Activity Logs",
          path: "/admin/logs",
          icon: Activity,
        },
        {
          name: "Settings",
          path: "/admin/settings",
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <div
      className="
        w-64
        h-[calc(100vh-4rem)]
        fixed top-16 left-0
        bg-purple-900 text-white
        px-4 py-6
        flex flex-col
        overflow-y-auto
      "
    >

      {/* Sections */}
      <div className="flex flex-col gap-6">
        {menuSections.map((section) => (
          <div key={section.title}>
            <p className="text-xs text-white/50 uppercase tracking-wider mb-2 px-2">
              {section.title}
            </p>

            <nav className="flex flex-col gap-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center gap-3
                      px-3 py-2.5
                      rounded-lg
                      text-sm font-medium
                      transition-all duration-200 ease-out
                      ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "hover:bg-white/10 hover:translate-x-1"
                      }
                    `}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </div>
  );
}
