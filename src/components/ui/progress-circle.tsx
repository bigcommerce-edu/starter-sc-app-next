const SIZE_PX: Record<"small" | "large", number> = {
  small: 24,
  large: 48,
};

// Replaces BigDesign's ProgressCircle: a pure-CSS spinner (no JS needed), so
// this stays a Server Component. The @keyframes rule lives inline via a
// <style> tag rather than a class in globals.css, since this is the only
// consumer and it keeps the animation colocated with the element it animates.
export function ProgressCircle({ size = "small" }: { size?: "small" | "large" }) {
  const diameter = SIZE_PX[size];

  return (
    <>
      <span
        style={{
          display: "inline-block",
          width: diameter,
          height: diameter,
          borderRadius: "50%",
          border: `${Math.max(2, diameter / 12)}px solid var(--color-primary20)`,
          borderTopColor: "var(--color-primary)",
          animation: "ui-progress-circle-spin 0.8s linear infinite",
        }}
      />
      <style>{`
        @keyframes ui-progress-circle-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
