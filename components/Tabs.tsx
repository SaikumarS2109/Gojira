'use client';

import React from 'react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-[#0066CC] text-white'
                : 'bg-white text-[#0066CC] border border-[#D0D4DC]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {tabs.find(t => t.id === activeTab)?.content}
      </div>
    </div>
  );
}
