// Replaces BigDesign's own Link: a plain, styled <a> with no router
// awareness, kept for genuinely external destinations (mailto:, tel:,
// target="_blank") — see developer-info-panel.tsx. In-app navigation should
// use AppLink instead (see app-link.tsx).
export function Link({ style, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...rest}
      className="ui-link"
      style={style}
    />
  );
}
