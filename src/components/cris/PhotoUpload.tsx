"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { uploadVehiclePhoto, uploadDriverPhoto } from "@/lib/actions/photos";

/** Botão "Trocar foto": abre o seletor de arquivo e sobe a imagem na hora. */
export function PhotoUpload({
  ownerId,
  kind,
  label = "Trocar foto",
}: {
  ownerId: string;
  kind: "vehicle" | "driver";
  label?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-selecionar o mesmo arquivo depois
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set(kind === "vehicle" ? "vehicleId" : "driverId", ownerId);
    fd.set("file", file);
    startTransition(async () => {
      const res =
        kind === "vehicle" ? await uploadVehiclePhoto({}, fd) : await uploadDriverPhoto({}, fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="photo-upload-btn"
        title={label}
      >
        <Camera size={15} /> {pending ? "Enviando…" : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onPick}
        className="hidden"
      />
      {error && <span className="text-[11px] font-semibold text-[var(--crit)]">{error}</span>}
    </>
  );
}
