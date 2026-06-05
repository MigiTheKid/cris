import { User, Truck } from "lucide-react";
import type { CrewItem } from "@/lib/data/command";

const PERSONAL_DOCS = ["CNH", "MOPP", "Toxicológico", "ASO"];

/** Card cinematográfico de motorista (usado no Coverflow do Painel). */
export function DriverBigCard({ d }: { d: CrewItem }) {
  return (
    <div className="cine-card drv-card2">
      <div style={{ position: "relative" }}>
        <div className="thumb" style={{ height: 172 }}>
          <div className="thumb-ph">
            <User size={30} />
            <span className="mono">foto do motorista</span>
          </div>
          <div className="cine-photo-over" />
        </div>
        <div className="cine-top">
          <span className="cine-comp">
            <Truck size={12} /> {d.vehiclePlate ?? "sem veículo"}
          </span>
          <span className="cine-light">
            <span className={`dot ${d.tone}`} />
            Sem data
          </span>
        </div>
        <div className="cine-plate-over">
          <div className="dc2-name-over">{d.name}</div>
        </div>
      </div>
      <div className="dc2-body">
        <div className="dc2-meta">Documentos pessoais</div>
        <div className="dc2-docs">
          {PERSONAL_DOCS.map((doc) => (
            <div key={doc} className="dc2-doc">
              <span className="dot idle" />
              <span className="dn">{doc}</span>
              <span className="dd">—</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
