import { redirect } from "next/navigation";

/** Entrada do app: por enquanto manda pro login.
 * Futuro: detectar sessão e cargo (admin/manager → /painel; driver → /motorista). */
export default function Home() {
  redirect("/login");
}
