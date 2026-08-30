interface TabsProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  accentColor?: string;
}

export default function Tabs({ tabs, active, onChange, accentColor }: TabsProps) {
  return (
    <div className="flex overflow-x-auto shrink-0 border-b border-border scrollbar-none">
      {tabs.map(tab => {
        const isActive = active === tab;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2
              ${isActive
                ? `text-text-primary ${accentColor ? '' : 'border-text-primary'}`
                : 'text-text-secondary border-transparent hover:text-text-primary'
              }`}
            style={isActive && accentColor ? { borderColor: accentColor, color: accentColor } : undefined}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
