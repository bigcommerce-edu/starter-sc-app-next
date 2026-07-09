"use client";

import { GlobalStyles } from "@bigcommerce/big-design";
import { theme } from "@bigcommerce/big-design-theme";
import { ThemeProvider } from "styled-components";

export * from "@bigcommerce/big-design";
export * from "@bigcommerce/big-design-icons";

export function BigDesignProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      {children}
    </ThemeProvider>
  );
}
