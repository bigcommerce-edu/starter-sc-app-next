import { Spacing, SpacingProps, spacingStyle } from "@/components/ui/spacing";

type Color = "primary" | "secondary70";

const COLOR_VAR: Record<Color, string> = {
  primary: "var(--color-primary)",
  secondary70: "var(--color-secondary70)",
};

// Text/Small/H1/H4 all take the same "margin shorthand + optional color"
// shape BigDesign's typography components did, just spread across a few
// semantic elements instead of one generic component.
interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  margin?: Spacing;
  marginTop?: Spacing;
  marginBottom?: Spacing;
  marginLeft?: Spacing;
  marginRight?: Spacing;
  color?: Color;
  bold?: boolean;
}

function pickSpacing({ margin, marginTop, marginBottom, marginLeft, marginRight }: SpacingProps) {
  return spacingStyle({ margin, marginTop, marginBottom, marginLeft, marginRight });
}

export function Text({ margin, marginTop, marginBottom, marginLeft, marginRight, color, bold, style, ...rest }: TypographyProps) {
  return (
    <p
      {...rest}
      style={{
        fontSize: "var(--font-size-medium)",
        fontWeight: bold ? "var(--font-weight-semiBold)" : "var(--font-weight-regular)",
        color: color ? COLOR_VAR[color] : undefined,
        ...pickSpacing({ margin, marginTop, marginBottom, marginLeft, marginRight }),
        ...style,
      }}
    />
  );
}

export function Small({ margin, marginTop, marginBottom, marginLeft, marginRight, color, bold, style, ...rest }: TypographyProps) {
  return (
    <small
      {...rest}
      style={{
        display: "block",
        fontSize: "var(--font-size-small)",
        fontWeight: bold ? "var(--font-weight-semiBold)" : "var(--font-weight-regular)",
        color: color ? COLOR_VAR[color] : "var(--color-secondary60)",
        ...pickSpacing({ margin, marginTop, marginBottom, marginLeft, marginRight }),
        ...style,
      }}
    />
  );
}

export function H1({ margin, marginTop, marginBottom, marginLeft, marginRight, style, ...rest }: TypographyProps) {
  return (
    <h1
      {...rest}
      style={{
        fontSize: "var(--font-size-xxLarge)",
        fontWeight: "var(--font-weight-semiBold)",
        ...pickSpacing({ margin, marginTop, marginBottom, marginLeft, marginRight }),
        ...style,
      }}
    />
  );
}

export function H4({ margin, marginTop, marginBottom, marginLeft, marginRight, style, ...rest }: TypographyProps) {
  return (
    <h4
      {...rest}
      style={{
        fontSize: "var(--font-size-large)",
        fontWeight: "var(--font-weight-semiBold)",
        ...pickSpacing({ margin, marginTop, marginBottom, marginLeft, marginRight }),
        ...style,
      }}
    />
  );
}
