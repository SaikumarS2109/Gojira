// lib/cardTypes.ts
export const CARD_TYPES = {
  EPIC: 'Epic',
  STORY: 'Story',
  SUBTASK: 'Subtask',
  TASK: 'Task',
  BUG: 'Bug',
} as const;

export type CardType = typeof CARD_TYPES[keyof typeof CARD_TYPES];

export const CARD_TYPE_ICONS: Record<CardType, string> = {
  Epic: '/icons/epic.svg',
  Story: '/icons/story.svg',
  Subtask: '/icons/subtask.svg',
  Task: '/icons/task.svg',
  Bug: '/icons/bug.svg',
};

export const CARD_TYPE_COLORS: Record<CardType, string> = {
  Epic: '#904EE2',    // Purple
  Story: '#63BA3C',   // Green
  Subtask: '#4BADE8', // Blue
  Task: '#4BADE8',    // Blue
  Bug: '#E5493A',     // Red
};

export const CARD_TYPE_LIST: CardType[] = Object.values(CARD_TYPES);

export interface CardTypeConfig {
  label: CardType;
  icon: string;
  color: string;
}

export function getCardTypeConfig(type: CardType): CardTypeConfig {
  return {
    label: type,
    icon: CARD_TYPE_ICONS[type],
    color: CARD_TYPE_COLORS[type],
  };
}

export function isValidCardType(value: any): value is CardType {
  return CARD_TYPE_LIST.includes(value);
}
