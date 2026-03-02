import type { ParticipantId } from '../types';
import { PARTICIPANT_MAP } from '../constants';

interface PersonAvatarProps {
  id: ParticipantId;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onClick?: () => void;
}

const sizes = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
};

export function PersonAvatar({ id, size = 'md', selected, onClick }: PersonAvatarProps) {
  const p = PARTICIPANT_MAP[id];
  const initial = p.name[0];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        ${sizes[size]} rounded-full flex items-center justify-center font-bold
        shrink-0 transition-all duration-200 cursor-pointer
        ${selected ? 'ring-2 ring-offset-2 ring-offset-bg-primary' : ''}
      `}
      style={{
        backgroundColor: p.color + '22',
        color: p.color,
        borderColor: selected ? p.color : 'transparent',
        borderWidth: '2px',
        ...(selected ? { boxShadow: `0 0 10px ${p.color}60` } : {}),
      }}
    >
      {initial}
    </button>
  );
}
