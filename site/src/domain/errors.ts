export type DomainErrorCode =
  | 'INVALID_REF'
  | 'NO_ROUTE'
  | 'NO_MATCH'
  | 'NOT_AVAILABLE'
  | 'INVALID_SELECTION'
  | 'INVALID_CRITERIA'
  | 'UNSUPPORTED_CRITERIA'
  | 'NOTHING_TO_UNDO'
  | 'CONFIRMATION_REQUIRED';

const messages: Record<DomainErrorCode, string> = {
  INVALID_REF: 'Choose a reference that exists in the current layout.',
  NO_ROUTE: 'No modeled route connects those references.',
  NO_MATCH: 'No single matching item was found.',
  NOT_AVAILABLE: 'That seat is not currently available.',
  INVALID_SELECTION: 'Choose between two and four different valid references.',
  INVALID_CRITERIA: 'Review the criteria and use valid finite values.',
  UNSUPPORTED_CRITERIA: 'Those criteria are not supported by the current rail layout.',
  NOTHING_TO_UNDO: 'There is no selection change to undo.',
  CONFIRMATION_REQUIRED: 'Finish or cancel confirmation before changing the selection.',
};

export class DomainError extends Error {
  constructor(public readonly code: DomainErrorCode, message?: string) {
    super(message ?? messages[code]);
    this.name = 'DomainError';
  }
}
