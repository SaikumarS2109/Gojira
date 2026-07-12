'use client';

import { useEffect, useRef } from 'react';

interface RenameColumnModalProps {
  isOpen: boolean;
  columnTitle: string;
  onConfirm: (newTitle: string) => void;
  onCancel: () => void;
}

export function RenameColumnModal({
  isOpen,
  columnTitle,
  onConfirm,
  onCancel,
}: RenameColumnModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTitle = inputRef.current?.value.trim();
    if (newTitle && newTitle !== columnTitle) {
      onConfirm(newTitle);
    }
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold text-[#172B4D] mb-4">Rename Column</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            defaultValue={columnTitle}
            placeholder="Column title"
            className="w-full px-3 py-2 border border-[#D0D4DC] rounded-md text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-[#42526E] hover:text-[#172B4D] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[#0066CC] hover:bg-[#0052A3] rounded-md transition"
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
