'use client';

import { useEffect, useRef } from 'react';
import { CardTypeSelector } from './CardTypeSelector';
import { CardType } from '@/lib/cardTypes';

interface TypeChangeModalProps {
  isOpen: boolean;
  currentType: CardType;
  enabledTypes: CardType[];
  onClose: () => void;
  onTypeChange: (type: CardType) => Promise<void>;
  isLoading?: boolean;
}

export function TypeChangeModal({
  isOpen,
  currentType,
  enabledTypes,
  onClose,
  onTypeChange,
  isLoading = false,
}: TypeChangeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTypeSelect = async (type: CardType) => {
    if (type !== currentType) {
      await onTypeChange(type);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
        role="dialog"
        aria-labelledby="modal-title"
      >
        <h2 id="modal-title" className="text-lg font-semibold text-[#172B4D] mb-4">
          Change Card Type
        </h2>

        <div className="mb-6">
          <CardTypeSelector
            enabledTypes={enabledTypes}
            selectedType={currentType}
            onSelect={handleTypeSelect}
            columns={4}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-[#42526E] hover:text-[#172B4D] transition disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
