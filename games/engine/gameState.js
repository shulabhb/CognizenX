export const GAME_PHASE = {
  INTRO: 'intro',
  PLAYING: 'playing',
  LOCKED: 'locked',
  COMPLETE: 'complete',
  PAUSED: 'paused',
};

export function canAcceptInput(phase) {
  return phase === GAME_PHASE.PLAYING;
}

export function isInputBlocked(phase) {
  return !canAcceptInput(phase);
}
