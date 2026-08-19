// Shared spacing-prop plumbing for Box/Flex, mirroring BigDesign's spacing
// scale (see globals.css's --spacing-* custom properties) so callers keep
// using the same "medium"/"large"/etc. vocabulary as before.
export type Spacing =
  | "none"
  | "xxSmall"
  | "xSmall"
  | "small"
  | "medium"
  | "large"
  | "xLarge"
  | "xxLarge"
  | "xxxLarge";

export interface SpacingProps {
  margin?: Spacing;
  marginTop?: Spacing;
  marginBottom?: Spacing;
  marginLeft?: Spacing;
  marginRight?: Spacing;
  marginHorizontal?: Spacing;
  marginVertical?: Spacing;
  padding?: Spacing;
  paddingTop?: Spacing;
  paddingBottom?: Spacing;
  paddingLeft?: Spacing;
  paddingRight?: Spacing;
  paddingHorizontal?: Spacing;
  paddingVertical?: Spacing;
}

function spacingVar(value: Spacing): string {
  return `var(--spacing-${value})`;
}

export function spacingStyle(props: SpacingProps): React.CSSProperties {
  const style: React.CSSProperties = {};

  if (props.margin !== undefined) style.margin = spacingVar(props.margin);
  if (props.marginVertical !== undefined) {
    style.marginTop = spacingVar(props.marginVertical);
    style.marginBottom = spacingVar(props.marginVertical);
  }
  if (props.marginHorizontal !== undefined) {
    style.marginLeft = spacingVar(props.marginHorizontal);
    style.marginRight = spacingVar(props.marginHorizontal);
  }
  if (props.marginTop !== undefined) style.marginTop = spacingVar(props.marginTop);
  if (props.marginBottom !== undefined) style.marginBottom = spacingVar(props.marginBottom);
  if (props.marginLeft !== undefined) style.marginLeft = spacingVar(props.marginLeft);
  if (props.marginRight !== undefined) style.marginRight = spacingVar(props.marginRight);

  if (props.padding !== undefined) style.padding = spacingVar(props.padding);
  if (props.paddingVertical !== undefined) {
    style.paddingTop = spacingVar(props.paddingVertical);
    style.paddingBottom = spacingVar(props.paddingVertical);
  }
  if (props.paddingHorizontal !== undefined) {
    style.paddingLeft = spacingVar(props.paddingHorizontal);
    style.paddingRight = spacingVar(props.paddingHorizontal);
  }
  if (props.paddingTop !== undefined) style.paddingTop = spacingVar(props.paddingTop);
  if (props.paddingBottom !== undefined) style.paddingBottom = spacingVar(props.paddingBottom);
  if (props.paddingLeft !== undefined) style.paddingLeft = spacingVar(props.paddingLeft);
  if (props.paddingRight !== undefined) style.paddingRight = spacingVar(props.paddingRight);

  return style;
}
