import type { ParticipantId } from '../types';
import { PARTICIPANT_MAP } from '../constants';

export function getVenmoPayLink(
  toId: ParticipantId,
  amountCents: number,
  note: string = 'Splitluride - Telluride ski trip'
): string {
  const handle = PARTICIPANT_MAP[toId].venmo;
  const encodedNote = encodeURIComponent(note);
  const dollars = (amountCents / 100).toFixed(2);
  return `venmo://paycharge?txn=pay&recipients=${handle}&amount=${dollars}&note=${encodedNote}`;
}

export function getVenmoFallbackLink(toId: ParticipantId): string {
  const handle = PARTICIPANT_MAP[toId].venmo;
  return `https://venmo.com/${handle}`;
}
