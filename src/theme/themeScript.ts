/**
 * Runs inline in <head> before first paint (see src/app/layout.tsx).
 *
 * Reads the guest's stored choice and writes data-mode on <html>. If
 * there is no stored choice, it writes nothing and the CSS
 * prefers-color-scheme block decides - that way "follow the system" is
 * genuinely live and reacts if the phone flips to dark at sunset,
 * instead of being frozen at whatever it was on first visit.
 *
 * Wrapped in try/catch: localStorage throws in private-mode Safari and
 * wherever site data is blocked, and a theme preference must never be
 * able to break the page.
 */
export const THEME_STORAGE_KEY = "stolikqr:mode";

export const THEME_INIT_SCRIPT = `
(function(){try{
  var m = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  if (m === "light" || m === "dark") document.documentElement.setAttribute("data-mode", m);
}catch(e){}})();
`;
