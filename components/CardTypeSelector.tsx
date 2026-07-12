'use client';

import Image from 'next/image';
import { CARD_TYPE_ICONS, CARD_TYPE_LIST, CardType } from '@/lib/cardTypes';

interface CardTypeSelectorProps {
  enabledTypes: CardType[];
  selectedType?: CardType;
  onSelect: (type: CardType) => void;
  columns?: number;
}

export function CardTypeSelector({
  enabledTypes,
  selectedType,
  onSelect,
  columns = 5,
}: CardTypeSelectorProps) {
  // Filter to only show enabled types in the order they appear in CARD_TYPE_LIST
  const visibleTypes = CARD_TYPE_LIST.filter((type) =>
    enabledTypes.includes(type)
  );

  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: `repeat(${Math.min(columns, visibleTypes.length)}, minmax(0, 1fr))`,
      }}
    >
      {visibleTypes.map((type) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition ${
            selectedType === type
              ? 'border-[#0066CC] bg-blue-50'
              : 'border-[#D0D4DC] hover:border-[#0066CC]'
          }`}
          title={type}
        >
          <Image
            src={CARD_TYPE_ICONS[type]}
            alt={type}
            width={32}
            height={32}
            className="flex-shrink-0"
          />
          <span className="text-xs font-medium text-[#172B4D]">{type}</span>
        </button>
      ))}
    </div>
  );
}
