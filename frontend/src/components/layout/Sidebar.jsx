import { Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { X } from "lucide-react";
import { ADMIN_NAV, HOSPITAL_NAV } from "@/constants/navigation";
import { useAuth } from "@/context/AuthContext";
import Logo from "./Logo";

function NavIcon({ name, className }) {
  const Icon = Icons[name] ?? Icons.Circle;
  return <Icon className={className} aria-hidden="true" />;
}

export default function Sidebar({ open, onClose }) {
  const { isAdmin } = useAuth();
  const sections = isAdmin ? ADMIN_NAV : HOSPITAL_NAV;

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Main navigation"
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-4">
          <Logo onDark />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section.section} className="mb-5">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted">
                {section.section}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onClose}
                      activeOptions={{ exact: item.to === "/hospital" }}
                      activeProps={{
                        className: "bg-primary text-primary-foreground shadow-sm",
                      }}
                      inactiveProps={{
                        className: "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                    >
                      <NavIcon name={item.icon} className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <p className="text-[11px] leading-relaxed text-sidebar-muted">
            Raw patient images never leave the hospital. Only model updates are shared.
          </p>
        </div>
      </aside>
    </>
  );
}
