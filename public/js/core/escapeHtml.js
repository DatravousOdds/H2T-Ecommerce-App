// Escapes quotes too (unlike the textContent/innerHTML trick), so the result
// is safe inside attribute="..." as well as element text.
export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
));
