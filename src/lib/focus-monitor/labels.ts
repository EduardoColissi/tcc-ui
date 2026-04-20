import type { FocusEventType } from './types';

export const FOCUS_EVENT_LABELS: Record<FocusEventType, string> = {
  PERSON_ABSENT: 'Você saiu da frente da câmera',
  CELL_PHONE: 'Celular detectado',
  MULTIPLE_PEOPLE: 'Outra pessoa apareceu',
  HEAD_TURNED: 'Rosto virado para longe da tela',
  LOOKING_DOWN: 'Olhando para baixo',
  EYES_CLOSED: 'Olhos fechados por muito tempo',
};
