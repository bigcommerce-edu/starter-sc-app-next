"use client";

interface TabItem {
  id: string;
  title: string;
  ariaControls: string;
}

interface TabsProps {
  activeTab: string;
  items: TabItem[];
  onTabClick(id: string): void;
}

// Replaces BigDesign's Tabs: an underline-style tablist for same-page panels
// (see gift-certificate-tabs.tsx — cross-page nav uses plain AppLinks in
// main-nav.tsx instead, not this component).
export function Tabs({ activeTab, items, onTabClick }: TabsProps) {
  return (
    <div role="tablist" style={{ display: "flex", gap: "var(--spacing-large)", borderBottom: "1px solid var(--border-color)" }}>
      {items.map((item) => {
        const isActive = item.id === activeTab;

        return (
          <button
            key={item.id}
            aria-controls={item.ariaControls}
            aria-selected={isActive}
            onClick={() => onTabClick(item.id)}
            role="tab"
            type="button"
            style={{
              background: "none",
              border: "none",
              borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
              color: isActive ? "var(--color-primary)" : "var(--color-secondary70)",
              cursor: "pointer",
              fontWeight: isActive ? "var(--font-weight-semiBold)" : "var(--font-weight-regular)",
              padding: "var(--spacing-small) 0",
            }}
          >
            {item.title}
          </button>
        );
      })}
    </div>
  );
}
