"use client";

import { useState } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  children?: (activeTab: string) => React.ReactNode;
  variant?: "default" | "pills";
}

export default function Tabs({
  tabs,
  defaultTab,
  onChange,
  children,
  variant = "default",
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  if (variant === "pills") {
    return (
      <div>
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id ? "" : "hover:bg-[var(--surface-elevated)]"
              }`}
              style={{
                background: activeTab === tab.id ? "var(--primary)" : "transparent",
                color: activeTab === tab.id ? "var(--background)" : "var(--foreground)",
                border: activeTab === tab.id ? "none" : "1px solid var(--border)",
              }}
            >
              {tab.icon && <span className="mr-2">{tab.icon}</span>}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className="ml-2 px-2 py-0.5 rounded-full text-xs"
                  style={{
                    background:
                      activeTab === tab.id ? "rgba(255,255,255,0.2)" : "var(--surface-elevated)",
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        {children?.(activeTab)}
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex gap-1 border-b overflow-x-auto scrollbar-hide"
        style={{ borderColor: "var(--border)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
              activeTab === tab.id ? "" : "hover:bg-[var(--surface-elevated)]"
            }`}
            style={{
              color: activeTab === tab.id ? "var(--primary)" : "var(--foreground)",
              opacity: activeTab === tab.id ? 1 : 0.7,
            }}
          >
            <div className="flex items-center gap-2">
              {tab.icon && <span>{tab.icon}</span>}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{
                    background:
                      activeTab === tab.id ? "var(--primary)" : "var(--surface-elevated)",
                    color:
                      activeTab === tab.id ? "var(--background)" : "var(--foreground)",
                  }}
                >
                  {tab.count}
                </span>
              )}
            </div>
            {activeTab === tab.id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: "var(--primary)" }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="mt-6">{children?.(activeTab)}</div>
    </div>
  );
}
