"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Truck, Users, BarChart3, Settings, LogOut } from "lucide-react";
import { CrisMark } from "./CrisMark";
import { Avatar } from "./Avatar";
import { signOut } from "@/lib/actions/auth";

const NAV = [
  { href: "/painel", label: "Hoje", icon: Home },
  { href: "/frota", label: "Frota", icon: Truck },
  { href: "/motoristas", label: "Motoristas", icon: Users },
  { href: "/indicadores", label: "Indicadores", icon: BarChart3 },
] as const;

export function Sidebar({ user }: { user: { name: string; roleLabel: string } }) {
  const pathname = usePathname();
  const firstName = user.name.split(" ")[0];
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="cris-word">
          <div className="cris-word-row">
            <CrisMark size={34} />
            <div className="cris-word-name">CRIS</div>
          </div>
          <Image
            className="cris-word-logo"
            src="/top-diesel.png"
            alt="TOP DIESEL"
            width={96}
            height={30}
          />
        </div>
      </div>

      <nav className="nav">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={isActive(href) ? "nav-item active" : "nav-item"}>
            <span className="nav-ico">
              <Icon size={20} strokeWidth={1.8} />
            </span>
            <span className="nav-label">{label}</span>
            <span className="nav-rail" />
          </Link>
        ))}
      </nav>

      <div className="nav-sep" />
      <Link
        href="/configuracoes"
        className={isActive("/configuracoes") ? "nav-item active" : "nav-item"}
      >
        <span className="nav-ico">
          <Settings size={20} strokeWidth={1.8} />
        </span>
        <span className="nav-label">Configurações</span>
        <span className="nav-rail" />
      </Link>

      <div className="sidebar-foot">
        <div className="user-chip" title={`${user.name} · ${user.roleLabel}`}>
          <Avatar name={user.name} size={36} hue={188} />
          <span className="user-meta">
            <span className="user-name">{firstName}</span>
            <span className="user-role">{user.roleLabel}</span>
          </span>
          <form action={signOut}>
            <button type="submit" className="user-out" title="Sair" aria-label="Sair">
              <LogOut size={17} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
