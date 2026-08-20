"use client";

import { useState } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { ServerStyleSheet, StyleSheetManager } from "styled-components";

export function StyledComponentsRegistry({ children }: { children: React.ReactNode }) {
  const [sheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = sheet.getStyleElement();
    sheet.instance.clearTag();
    return <>{styles}</>;
  });

  // On the client, styled-components defaults to "speedy" mode in production
  // builds: it injects rules through the CSSOM (`CSSStyleSheet.insertRule`)
  // rather than as text in the <style> tag. On hydration it rehydrates the
  // server-rendered tags into one CSSOM sheet, removes them, and from then on
  // every rule lives *only* in `document.styleSheets` — the surviving tag's
  // textContent is empty (verified: 0 characters of text, 291 CSSOM rules).
  //
  // That's fine standalone, but the app also renders inside the BigCommerce
  // control panel's iframe, where CSSOM-only rules were being lost: the nav's
  // active item kept its inline border-radius and its `color` (a prop on
  // BigDesign's Text) but lost the generated Box class's background-color and
  // padding, i.e. exactly the rules that existed only in the CSSOM.
  //
  // disableCSSOMInjection keeps the client on text-based injection, so rules
  // stay in the DOM as real stylesheet text and survive that context. The
  // cost is slower style injection, which is not measurable at this app's
  // scale — a few hundred rules.
  //
  // SC_DISABLE_SPEEDY is the other documented lever, but it can't work here:
  // styled-components reads it once at module load in the browser bundle, so
  // setting it in the server environment has no effect on the client.
  if (typeof window !== "undefined") {
    return <StyleSheetManager disableCSSOMInjection>{children}</StyleSheetManager>;
  }

  return (
    <StyleSheetManager disableCSSOMInjection sheet={sheet.instance}>
      {children}
    </StyleSheetManager>
  );
}
