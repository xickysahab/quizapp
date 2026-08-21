import crypto from 'crypto';

const CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generateRoomCode = (): string => {
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += CHARACTERS.charAt(crypto.randomInt(CHARACTERS.length));
  }
  return result;
};
