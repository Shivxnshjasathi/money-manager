interface TabsProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  accentColor?: string;
}

export default function Tabs({ tabs, active, onChange, accentColor }: TabsProps) {
  return (
    <div className="flex overflow-x-auto shrink-0 scrollbar-none px-4 py-3 gap-2 border-b border-border/50">
      {tabs.map(tab => {
        const isActive = active === tab;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`px-5 py-2 text-[13px] font-bold whitespace-nowrap rounded-2xl transition-all duration-300
              ${isActive
                ? 'bg-coral text-bg shadow-lg shadow-black/10 scale-105'
                : 'bg-surface/50 text-text-secondary hover:bg-surface hover:text-text-primary'
              }`}
            style={isActive && accentColor ? { backgroundColor: accentColor, color: 'var(--app-bg)' } : undefined}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
