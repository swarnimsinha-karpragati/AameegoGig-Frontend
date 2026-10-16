/** Organisations worth showing in the switcher. One match stays hidden. */
export const organisationsForSwitcher = (organisations, currentCode) => {
  const current = String(currentCode || "").trim().toUpperCase();
  const seen = new Set();
  const list = [];

  for (const org of organisations || []) {
    const code = String(org?.code || "").trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    list.push({
      code,
      name: String(org?.name || code).trim() || code,
      current: code === current,
    });
  }

  if (list.length < 2) return [];
  return list.sort(
    (a, b) => Number(b.current) - Number(a.current) || a.name.localeCompare(b.name)
  );
};
