import { CATEGORIES } from '../constants';
import type { Category } from '../types';

interface CategoryPickerProps {
  selected: Category;
  onChange: (category: Category) => void;
}

export function CategoryPicker({ selected, onChange }: CategoryPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {CATEGORIES.map((cat) => {
        const isSelected = cat.id === selected;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={`
              flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg
              border transition-all duration-200 cursor-pointer text-center
              ${isSelected
                ? 'border-neon-pink/60 bg-neon-pink/10 neon-glow-pink'
                : 'border-white/10 bg-white/5 hover:border-white/20'
              }
            `}
          >
            <span className="text-lg">{cat.emoji}</span>
            <span className="text-[9px] text-snow/70 leading-tight">{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
