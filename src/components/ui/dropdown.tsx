"use client";

import { useEffect, useRef, useState } from "react";
import { AppLink } from "@/components/ui/app-link";

export interface DropdownItem {
  content: string;
  disabled?: boolean;
  onItemClick(): void;
}

export interface DropdownLinkItem {
  type: "link";
  content: string;
  url: string;
}

interface DropdownProps {
  items: Array<DropdownItem | DropdownLinkItem>;
  maxHeight?: number;
  placement?: "bottom-end" | "bottom-start";
  toggle: React.ReactNode;
}

function isLinkItem(item: DropdownItem | DropdownLinkItem): item is DropdownLinkItem {
  return "type" in item && item.type === "link";
}

// Replaces BigDesign's Dropdown with a plain controlled <div> menu
// (click-outside and Escape both close it) rather than a portal — the
// per-row menus in gift-certificate/customer tables previously needed a
// portal-teardown workaround (see PendingOverlay's comment); rendering the
// menu inline instead avoids that class of problem entirely.
export function Dropdown({ items, maxHeight, placement = "bottom-end", toggle }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <div onClick={() => setIsOpen((current) => !current)}>{toggle}</div>

      {isOpen && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "100%",
            right: placement === "bottom-end" ? 0 : undefined,
            left: placement === "bottom-start" ? 0 : undefined,
            zIndex: 10,
            marginTop: "var(--spacing-xxSmall)",
            minWidth: 160,
            maxHeight,
            overflowY: maxHeight ? "auto" : undefined,
            backgroundColor: "var(--color-white)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--border-radius-normal)",
            boxShadow: "var(--shadow-floating)",
            padding: "var(--spacing-xxSmall) 0",
          }}
        >
          {items.map((item) =>
            isLinkItem(item) ? (
              <AppLink
                key={item.content}
                className="dropdown-item"
                href={item.url}
                onClick={() => setIsOpen(false)}
                role="menuitem"
              >
                {item.content}
              </AppLink>
            ) : (
              <button
                key={item.content}
                className="dropdown-item"
                disabled={item.disabled}
                onClick={() => {
                  setIsOpen(false);
                  item.onItemClick();
                }}
                role="menuitem"
                type="button"
              >
                {item.content}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
