type IconSize = "small" | "medium" | "large" | "xLarge";
type IconColor = "secondary60" | "danger50";

const SIZE_PX: Record<IconSize, number> = {
  small: 16,
  medium: 20,
  large: 24,
  xLarge: 32,
};

const COLOR_VAR: Record<IconColor, string> = {
  secondary60: "var(--color-secondary60)",
  danger50: "var(--color-danger50)",
};

interface IconProps {
  size?: IconSize;
  color?: IconColor;
}

function iconProps({ size = "medium", color }: IconProps) {
  const px = SIZE_PX[size];

  return {
    width: px,
    height: px,
    viewBox: "0 0 24 24",
    fill: color ? COLOR_VAR[color] : "currentColor",
    "aria-hidden": true,
  } as const;
}

// Small, self-contained replacements for the 6 BigDesign icons actually used
// in the app (see big-design-icons.tsx barrel, now removed). Server
// Components — plain inline SVG, no client behavior.
export function MoreHorizIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

export function FilterListIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 6h16v2H4zM7 11h10v2H7zM10 16h4v2h-4z" />
    </svg>
  );
}

export function ArrowBackIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M20 11H7.83l4.88-4.88a1 1 0 1 0-1.42-1.41l-6.59 6.58a1 1 0 0 0 0 1.42l6.59 6.58a1 1 0 0 0 1.42-1.41L7.83 13H20a1 1 0 0 0 0-2Z" />
    </svg>
  );
}

export function OpenInNewIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M14 4h6v6h-2V7.41l-8.29 8.3-1.42-1.42 8.3-8.29H14Zm4 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7v2H6v12h12v-7h2v7a2 2 0 0 1-2 2Z" />
    </svg>
  );
}

export function ErrorIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 2 1 21h22L12 2Zm1 15h-2v2h2v-2Zm0-7h-2v5h2v-5Z" />
    </svg>
  );
}

export function BaselineHelpIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 17h-2v-2h2Zm2.07-7.75-.9.92A2.5 2.5 0 0 0 13 14h-2v-.5a3 3 0 0 1 .88-2.12l1.24-1.26A1.5 1.5 0 1 0 10.5 9H8.5a3.5 3.5 0 1 1 6.57 1.25Z" />
    </svg>
  );
}
