import { describe, it, expect } from "vitest";
import { expiryStatus, daysUntil } from "./expiry";

const HOJE = new Date("2026-06-03T12:00:00Z");

describe("expiryStatus", () => {
  it("retorna sem_data quando não há validade", () => {
    expect(expiryStatus(null, HOJE)).toBe("sem_data");
    expect(expiryStatus(undefined, HOJE)).toBe("sem_data");
  });

  it("retorna vencido quando a data já passou", () => {
    expect(expiryStatus(new Date("2026-06-02"), HOJE)).toBe("vencido");
  });

  it("retorna critico até D-7", () => {
    expect(expiryStatus(new Date("2026-06-03"), HOJE)).toBe("critico"); // hoje
    expect(expiryStatus(new Date("2026-06-10"), HOJE)).toBe("critico"); // +7
  });

  it("retorna alerta entre D-8 e D-15", () => {
    expect(expiryStatus(new Date("2026-06-11"), HOJE)).toBe("alerta"); // +8
    expect(expiryStatus(new Date("2026-06-18"), HOJE)).toBe("alerta"); // +15
  });

  it("retorna atencao entre D-16 e D-30", () => {
    expect(expiryStatus(new Date("2026-06-19"), HOJE)).toBe("atencao"); // +16
    expect(expiryStatus(new Date("2026-07-03"), HOJE)).toBe("atencao"); // +30
  });

  it("retorna em_dia acima de 30 dias", () => {
    expect(expiryStatus(new Date("2026-07-04"), HOJE)).toBe("em_dia"); // +31
  });
});

describe("daysUntil", () => {
  it("conta dias inteiros ignorando hora", () => {
    expect(daysUntil(new Date("2026-06-10"), HOJE)).toBe(7);
    expect(daysUntil(new Date("2026-06-02"), HOJE)).toBe(-1);
  });
});
