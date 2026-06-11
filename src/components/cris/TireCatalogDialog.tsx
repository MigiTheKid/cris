"use client";

import { useActionState, useEffect, useMemo, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveTireCatalog } from "@/lib/actions/settings";
import type { TireCatalog } from "@/lib/tires";

const inputCls =
  "h-10 flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)]";
const labelCls = "text-xs font-bold tracking-[0.08em] text-[var(--text-2)] uppercase";

function ci(s: string) {
  return s.replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel-solid)] py-1 pr-1.5 pl-2.5 text-sm font-semibold text-[var(--text)]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover ${label}`}
        className="grid size-5 place-items-center rounded-md text-[var(--text-3)] hover:bg-[var(--hover)] hover:text-[var(--crit)]"
      >
        <X size={13} />
      </button>
    </span>
  );
}

/** Gerencia o catálogo controlado (marca / modelo / medida) num único formulário. */
export function TireCatalogDialog({
  trigger,
  catalog,
}: {
  trigger: ReactElement;
  catalog: TireCatalog;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveTireCatalog, {});

  const [brands, setBrands] = useState<string[]>(catalog.brands);
  const [sizes, setSizes] = useState<string[]>(catalog.sizes);
  const [models, setModels] = useState<{ brand: string; name: string }[]>(catalog.models);

  const [brandInput, setBrandInput] = useState("");
  const [sizeInput, setSizeInput] = useState("");
  const [modelBrand, setModelBrand] = useState(catalog.brands[0] ?? "");
  const [modelInput, setModelInput] = useState("");

  // Reabriu? Recarrega o catálogo salvo (evita estado velho após cancelar).
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBrands(catalog.brands);
      setSizes(catalog.sizes);
      setModels(catalog.models);
      setModelBrand(catalog.brands[0] ?? "");
      setBrandInput("");
      setSizeInput("");
      setModelInput("");
    }
  }, [open, catalog]);

  useEffect(() => {
    if (state.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  const payload = useMemo(() => JSON.stringify({ brands, sizes, models }), [brands, sizes, models]);

  function addBrand() {
    const v = brandInput.replace(/\s+/g, " ").trim();
    if (!v) return;
    if (brands.some((b) => ci(b) === ci(v))) {
      setBrandInput("");
      return;
    }
    setBrands([...brands, v]);
    if (!modelBrand) setModelBrand(v);
    setBrandInput("");
  }
  function removeBrand(b: string) {
    setBrands(brands.filter((x) => x !== b));
    setModels(models.filter((m) => ci(m.brand) !== ci(b)));
    if (ci(modelBrand) === ci(b)) setModelBrand("");
  }
  function addSize() {
    const v = sizeInput.replace(/\s+/g, " ").trim();
    if (!v) return;
    if (sizes.some((s) => ci(s) === ci(v))) {
      setSizeInput("");
      return;
    }
    setSizes([...sizes, v]);
    setSizeInput("");
  }
  function addModel() {
    const name = modelInput.replace(/\s+/g, " ").trim();
    if (!name || !modelBrand) return;
    if (models.some((m) => ci(m.brand) === ci(modelBrand) && ci(m.name) === ci(name))) {
      setModelInput("");
      return;
    }
    setModels([...models, { brand: modelBrand, name }]);
    setModelInput("");
  }

  const modelsByBrand = brands
    .map((b) => ({ brand: b, items: models.filter((m) => ci(m.brand) === ci(b)) }))
    .filter((g) => g.items.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catálogo de pneus</DialogTitle>
          <DialogDescription>
            Marcas, modelos e medidas que aparecem no cadastro. Listas controladas evitam grafias
            divergentes (ex.: “Michelin” e “michelin”).
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="catalog" value={payload} />

          {/* Marcas */}
          <div className="space-y-2">
            <span className={labelCls}>Marcas</span>
            <div className="flex gap-2">
              <input
                className={inputCls}
                value={brandInput}
                onChange={(e) => setBrandInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addBrand();
                  }
                }}
                placeholder="ex.: Michelin"
              />
              <button type="button" className="cbtn ghost px-3" onClick={addBrand}>
                <Plus size={16} /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {brands.length === 0 ? (
                <span className="text-xs text-[var(--text-3)]">Nenhuma marca ainda.</span>
              ) : (
                brands.map((b) => <Chip key={b} label={b} onRemove={() => removeBrand(b)} />)
              )}
            </div>
          </div>

          {/* Medidas */}
          <div className="space-y-2">
            <span className={labelCls}>Medidas</span>
            <div className="flex gap-2">
              <input
                className={inputCls + " mono"}
                value={sizeInput}
                onChange={(e) => setSizeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSize();
                  }
                }}
                placeholder="ex.: 295/80 R22.5"
              />
              <button type="button" className="cbtn ghost px-3" onClick={addSize}>
                <Plus size={16} /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sizes.length === 0 ? (
                <span className="text-xs text-[var(--text-3)]">Nenhuma medida ainda.</span>
              ) : (
                sizes.map((s) => (
                  <Chip key={s} label={s} onRemove={() => setSizes(sizes.filter((x) => x !== s))} />
                ))
              )}
            </div>
          </div>

          {/* Modelos (por marca) */}
          <div className="space-y-2">
            <span className={labelCls}>Modelos (por marca)</span>
            <div className="flex gap-2">
              <select
                className={inputCls + " max-w-[40%]"}
                value={modelBrand}
                onChange={(e) => setModelBrand(e.target.value)}
                disabled={brands.length === 0}
              >
                {brands.length === 0 && <option value="">—</option>}
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <input
                className={inputCls}
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addModel();
                  }
                }}
                placeholder="ex.: X Multi Z"
                disabled={brands.length === 0}
              />
              <button
                type="button"
                className="cbtn ghost px-3"
                onClick={addModel}
                disabled={brands.length === 0}
              >
                <Plus size={16} /> Add
              </button>
            </div>
            {modelsByBrand.length === 0 ? (
              <span className="text-xs text-[var(--text-3)]">
                Opcional — os modelos ficam filtrados pela marca no cadastro.
              </span>
            ) : (
              <div className="flex flex-col gap-2">
                {modelsByBrand.map((g) => (
                  <div key={g.brand} className="flex flex-wrap items-center gap-1.5">
                    <span className="mono text-xs font-bold text-[var(--text-3)]">{g.brand}:</span>
                    {g.items.map((m) => (
                      <Chip
                        key={m.name}
                        label={m.name}
                        onRemove={() =>
                          setModels(
                            models.filter(
                              (x) => !(ci(x.brand) === ci(m.brand) && x.name === m.name),
                            ),
                          )
                        }
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {state.error && (
            <div className="rounded-xl border border-[color-mix(in_oklab,var(--crit)_30%,transparent)] bg-[color-mix(in_oklab,var(--crit)_12%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--crit)]">
              {state.error}
            </div>
          )}

          <DialogFooter>
            <DialogClose
              render={
                <button type="button" className="cbtn ghost">
                  Cancelar
                </button>
              }
            />
            <button type="submit" className="cbtn primary" disabled={pending}>
              {pending ? "Salvando…" : "Salvar catálogo"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
