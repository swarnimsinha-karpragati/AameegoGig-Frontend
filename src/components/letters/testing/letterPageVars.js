export const LETTER_PAGE_VARS = {
  "--letter-page-width": " 210mm",
  "--letter-page-height": "297mm",
  "--letter-page-margin-top": "40px",
  "--letter-page-margin-right": "40px",
  "--letter-page-margin-bottom": "60px",
  "--letter-page-margin-left": "40px",
};

/** jsdom does not resolve custom properties in getComputedStyle (browsers do); this supplies them. */
export const provideLetterPageVars = (win, vars = LETTER_PAGE_VARS) => {
  const original = win.getComputedStyle.bind(win);
  win.getComputedStyle = (el, pseudo) => {
    const computed = original(el, pseudo);
    if (el !== win.document.documentElement) return computed;
    return { getPropertyValue: (name) => vars[name] ?? computed.getPropertyValue(name) };
  };
};
