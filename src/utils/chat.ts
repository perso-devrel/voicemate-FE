import type { Message } from '@/types';

// A "round-trip" = you send a message and the partner replies.
// Count the number of user→partner sender transitions in chronological order.
export function countRoundTrips(messages: Message[], userId: string | null): number {
  if (!userId) return 0;
  let count = 0;
  let awaitingReply = false;
  for (const m of messages) {
    const mine = m.sender_id === userId;
    if (mine) {
      awaitingReply = true;
    } else if (awaitingReply) {
      count++;
      awaitingReply = false;
    }
  }
  return count;
}

export const UNLOCK_MAIN_PHOTO_AT = 5;
export const UNLOCK_ALL_PHOTOS_AT = 10;

export type PhotoRevealStage = 'blurred' | 'main' | 'all';

export function photoRevealStage(roundTrips: number): PhotoRevealStage {
  if (roundTrips >= UNLOCK_ALL_PHOTOS_AT) return 'all';
  if (roundTrips >= UNLOCK_MAIN_PHOTO_AT) return 'main';
  return 'blurred';
}
