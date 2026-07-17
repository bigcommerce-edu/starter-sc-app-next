import { SpacingProps, spacingStyle } from "@/components/ui/spacing";

interface FlexProps extends SpacingProps, React.HTMLAttributes<HTMLDivElement> {
  alignItems?: React.CSSProperties["alignItems"];
  justifyContent?: React.CSSProperties["justifyContent"];
  flexDirection?: React.CSSProperties["flexDirection"];
  flexWrap?: React.CSSProperties["flexWrap"];
  flexGap?: string;
}

// Replaces BigDesign's Flex: a <div style="display: flex"> plus the same
// spacing props as Box, so callers migrate by swapping the import only.
export function Flex({
  alignItems,
  justifyContent,
  flexDirection,
  flexWrap,
  flexGap,
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
  style,
  ...rest
}: FlexProps) {
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
        display: "flex",
        alignItems,
        justifyContent,
        flexDirection,
        flexWrap,
        gap: flexGap,
        ...spacing,
        ...style,
      }}
    />
  );
}

interface FlexItemProps extends React.HTMLAttributes<HTMLDivElement> {
  flexGrow?: number;
  flexShrink?: number;
}

export function FlexItem({ flexGrow, flexShrink, style, ...rest }: FlexItemProps) {
  return <div {...rest} style={{ flexGrow, flexShrink, ...style }} />;
}
