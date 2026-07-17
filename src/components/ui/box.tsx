import { SpacingProps, spacingStyle } from "@/components/ui/spacing";

type Color = "primary" | "secondary70" | "danger50";

const COLOR_VAR: Record<Color, string> = {
  primary: "var(--color-primary)",
  secondary70: "var(--color-secondary70)",
  danger50: "var(--color-danger50)",
};

interface BoxProps extends SpacingProps, React.HTMLAttributes<HTMLDivElement> {
  backgroundColor?: "primary10";
  color?: Color;
}

// Thin <div> wrapper replacing BigDesign's Box: spacing props map to the same
// spacing scale (see spacing.ts/globals.css), everything else (id, role,
// aria-*, style, etc.) passes straight through to the underlying element.
export function Box({
  margin,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  marginHorizontal,
  marginVertical,
  padding,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  paddingHorizontal,
  paddingVertical,
  backgroundColor,
  color,
  style,
  ...rest
}: BoxProps) {
  const spacing = spacingStyle({
    margin,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    marginHorizontal,
    marginVertical,
    padding,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    paddingHorizontal,
    paddingVertical,
  });

  return (
    <div
      {...rest}
      style={{
        ...spacing,
        ...(backgroundColor ? { backgroundColor: "var(--color-primary10)" } : undefined),
        ...(color ? { color: COLOR_VAR[color] } : undefined),
        ...style,
      }}
    />
  );
}
