export const sanitizeId = (s: string | undefined | null) => {
  if (s === undefined || s === null) return '';
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '_');
};

export default sanitizeId;
