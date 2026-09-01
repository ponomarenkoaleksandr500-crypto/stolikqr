/**
 * Runs inline in <head> before first paint (see src/app/layout.tsx).
 *
 * Two states only: light and dark, and dark is the default. Anyone who has
 * not explicitly chosen light gets dark, including a first-time guest -
 * the device's prefers-color-scheme is deliberately not consulted, since a
 * two-state toggle cannot express "follow the system" anyway.
 *
 * The attribute is always written explicitly rather than relying on the
 * CSS default, so the rendered mode is visible in the DOM and does not
 * depend on which stylesheet rule happens to win.
 *
 * Wrapped in try/catch: localStorage throws in private-mode Safari and
 * wherever site data is blocked, and a theme preference must never be able
 * to break the page. On failure the guest simply gets the dark default.
 */
export const THEME_STORAGE_KEY = "stolikqr:mode";

export const THEME_INIT_SCRIPT = `
(function(){var m="dark";try{
  if (localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) === "light") m = "light";
}catch(e){}
document.documentElement.setAttribute("data-mode", m);})();
`;
