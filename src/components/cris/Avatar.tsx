/** Avatar de iniciais com matiz derivado do nome (ou fixo via hue). */
export function Avatar({ name, size = 36, hue }: { name: string; size?: number; hue?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const h = hue ?? (name.charCodeAt(0) * 7) % 360;
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, "--ah": h, fontSize: size * 0.36 } as React.CSSProperties}
    >
      {initials}
    </div>
  );
}
