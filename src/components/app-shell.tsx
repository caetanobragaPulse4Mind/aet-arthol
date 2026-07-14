import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Receipt, Truck, Boxes, Map, Users, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/boletos", label: "Boletos", icon: Receipt },
  { to: "/veiculos", label: "Veículos", icon: Truck },
  { to: "/composicoes", label: "Composições", icon: Boxes },
  { to: "/trechos", label: "Trechos", icon: Map, adminOnly: true },
  { to: "/usuarios", label: "Usuários", icon: Users, adminOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = profile?.role === "admin";

  async function handleLogout() {
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-[oklch(0.18_0.04_265)] text-slate-100">
        <div className="px-6 py-5 border-b border-white/10">
          <div className="text-xl font-bold tracking-tight">ATRHOL</div>
          <div className="text-xs text-slate-400 mt-0.5">Sistema de AETs</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.filter((n) => !n.adminOnly || isAdmin).map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-white/10 text-white font-medium"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10 text-xs text-slate-400">
          ATRHOL Transportes © {new Date().getFullYear()}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-white flex items-center justify-between px-6">
          <div className="md:hidden text-base font-semibold text-slate-900">ATRHOL</div>
          <div className="hidden md:block text-sm text-slate-500">Gerenciamento de AETs</div>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <div className="text-sm font-medium text-slate-900">{profile?.nome ?? "—"}</div>
              <div className="text-xs text-slate-500">{profile?.role === "admin" ? "Administrador" : "Operador"}</div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1.5" /> Sair
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}
