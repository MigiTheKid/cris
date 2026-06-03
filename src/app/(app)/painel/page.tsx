import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Users } from "lucide-react";

/**
 * Painel (dashboard) — placeholder visual da M1.
 * Estrutura: faixa de alertas + carrossel FROTA + carrossel MOTORISTAS.
 * Dados reais entram quando o banco estiver de pé. Carrossel hoje é scroll horizontal de cards.
 */
export default function PainelPage() {
  return (
    <div className="space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Painel</h1>
        <p className="text-muted-foreground text-sm">Visão geral da frota e dos motoristas</p>
      </header>

      {/* Faixa de alertas críticos (placeholder) */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Críticos</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-red-600">—</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Alertas</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-amber-500">—</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Em dia</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-emerald-600">—</CardContent>
        </Card>
      </section>

      {/* Carrossel FROTA (placeholder) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Truck className="size-5" />
          <h2 className="text-lg font-semibold">Frota</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="w-48 shrink-0">
              <CardContent className="text-muted-foreground flex h-32 flex-col items-center justify-center gap-2">
                <Truck className="size-8" />
                <span className="text-xs">Veículo {i}</span>
                <Badge variant="outline">aguardando dados</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Carrossel MOTORISTAS (placeholder) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="size-5" />
          <h2 className="text-lg font-semibold">Motoristas</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="w-48 shrink-0">
              <CardContent className="text-muted-foreground flex h-32 flex-col items-center justify-center gap-2">
                <Users className="size-8" />
                <span className="text-xs">Motorista {i}</span>
                <Badge variant="outline">aguardando dados</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
