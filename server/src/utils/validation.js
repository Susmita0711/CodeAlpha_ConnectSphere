export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const isValidRoomId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{6,64}$/.test(value);

export const safeFileName = (value) => {
  const cleaned = value.replace(/[^\w.\-() ]/g, '_').slice(0, 180).trim();
  return cleaned || 'shared-file';
};
