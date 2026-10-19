export const normalizeNumber = (s: string) => s.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "");

/** "e4937" and "4937", "0366" and "366" compare equal. */
export const bareNumber = (n: string) => n.replace(/^e/, "").replace(/^0+/, "");
