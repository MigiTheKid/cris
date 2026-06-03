import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Tela de login (placeholder visual da M1).
 * Auth real (CPF + senha via Supabase) entra quando o banco estiver de pé.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-zinc-900 text-xl font-bold text-white dark:bg-white dark:text-zinc-900">
            CR
          </div>
          <CardTitle className="text-2xl">CRIS</CardTitle>
          <CardDescription>Gestão de frota — entre com seu CPF</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" inputMode="numeric" placeholder="000.000.000-00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" placeholder="••••••" />
          </div>
          {/* Liga ao Supabase Auth na próxima fase. Por ora, navega ao painel. */}
          <Link href="/painel" className={buttonVariants({ className: "w-full" })}>
            Entrar
          </Link>
          <p className="text-muted-foreground text-center text-sm">
            Esqueceu a senha? Fale com o Gabriel.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
