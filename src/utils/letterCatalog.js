export const CATALOG_GROUPS = [
  { id: "joining", label: "Joining", keys: ["offer", "internship", "appointment"] },
  { id: "during", label: "During employment", keys: ["confirmation", "promotion", "increment", "transfer", "employment-verification", "noc"] },
  { id: "disciplinary", label: "Disciplinary", keys: ["show-cause", "warning"] },
  { id: "leaving", label: "Leaving", keys: ["relieving", "experience", "termination"] },
  { id: "consultants", label: "Consultants", keys: ["consultancy-agreement"] },
];

const CUSTOM_GROUP = { id: "custom", label: "Your templates" };

/** Saved template category → catalog group. Must cover every category the backend accepts. */
export const CATEGORY_GROUP = {
  Onboarding: "joining",
  "Employment changes": "during",
  Disciplinary: "disciplinary",
  Exit: "leaving",
  Consultancy: "consultants",
  Custom: CUSTOM_GROUP.id,
};

const GROUPS = [...CATALOG_GROUPS, CUSTOM_GROUP];
const GROUP_BY_ID = Object.fromEntries(GROUPS.map((g) => [g.id, g]));
const GROUP_ID_BY_KEY = Object.fromEntries(CATALOG_GROUPS.flatMap((g) => g.keys.map((key) => [key, g.id])));

/** Options for choosing a template's Group; the value is the saved category. */
export const GROUP_OPTIONS = Object.entries(CATEGORY_GROUP).map(([value, id]) => ({ value, label: GROUP_BY_ID[id].label }));

export const groupLabelForCategory = (category) => GROUP_BY_ID[CATEGORY_GROUP[category]]?.label || CUSTOM_GROUP.label;

/**
 * The saved Group (category) decides where every template is listed, built-ins included; the
 * built-in key is only a fallback for a missing or unknown category.
 */
export function templateGroup(template) {
  const id = CATEGORY_GROUP[template?.category] || GROUP_ID_BY_KEY[template?.key] || CUSTOM_GROUP.id;
  const { label } = GROUP_BY_ID[id];
  return { id, label };
}

export const LETTER_DESCRIPTIONS = {
  offer: "Offer a job to a selected candidate",
  internship: "Offer an internship to a candidate",
  appointment: "Formal appointment after an employee joins",
  confirmation: "Confirm an employee after probation",
  promotion: "Announce a new role or designation",
  increment: "Share a salary revision",
  transfer: "Move an employee to another location or team",
  "employment-verification": "Confirm employment for a bank, visa or landlord",
  noc: "No objection certificate for an employee request",
  "show-cause": "Ask an employee to explain a conduct issue",
  warning: "Formal warning for a conduct or performance issue",
  relieving: "Confirm an employee has been relieved",
  experience: "Certificate for employees who have left",
  termination: "End an employee's employment",
  "consultancy-agreement": "Agreement for a consultant engagement",
};

export const OFFER_TEMPLATE_KEY = "offer";

const LETTER_NAMES = {
  offer: "offer letter",
  internship: "internship offer",
  appointment: "appointment letter",
  confirmation: "confirmation letter",
  promotion: "promotion letter",
  increment: "increment letter",
  transfer: "transfer letter",
  "employment-verification": "employment verification letter",
  noc: "NOC",
  "show-cause": "show cause notice",
  warning: "warning letter",
  relieving: "relieving letter",
  experience: "experience certificate",
  termination: "termination letter",
  "consultancy-agreement": "consultancy agreement",
};

/** Plain-language name for a built-in template key, for sentences; "" for custom keys. */
export const letterNameForKey = (key) => (key && LETTER_NAMES[key]) || "";


const isActive = (template) => Boolean(template) && template.status !== "archived";

/**
 * Templates a user may issue from here. The backend list is only scoped for some roles
 * (e.g. letters:view users get every template), so issuing screens must apply this too.
 */
export function filterIssuableTemplates(templates, { recipientRule = null, recipientType = "" } = {}) {
  return (templates || []).filter(
    (t) => isActive(t) && (!recipientRule || t.recipientRule === recipientRule) && (!recipientType || t.recipientType === recipientType)
  );
}

export function findTemplateByKey(templates, key) {
  if (!key) return null;
  return (templates || []).find((t) => isActive(t) && t.key === key) || null;
}

export function describeTemplate(template) {
  if (!template) return "";
  if (LETTER_DESCRIPTIONS[template.key]) return LETTER_DESCRIPTIONS[template.key];
  if (template.description) return template.description;
  const group = CATEGORY_GROUP[template.category];
  return group && group !== CUSTOM_GROUP.id ? `${groupLabelForCategory(template.category)} letter` : "Letter";
}

const byName = (a, b) =>
  String(a.template.name || "").localeCompare(String(b.template.name || ""), undefined, { sensitivity: "base" });

export function buildLetterCatalog(templates, { search = "" } = {}) {
  const query = String(search || "").trim().toLowerCase();
  const active = filterIssuableTemplates(templates);

  const groups = GROUPS.map((g) => ({ id: g.id, label: g.label, items: [] }));
  const groupById = Object.fromEntries(groups.map((g) => [g.id, g]));

  active.forEach((template) => {
    const group = groupById[templateGroup(template).id];
    const item = { template, description: describeTemplate(template) };
    if (query) {
      const haystack = [template.name, item.description, group.label].join("\n").toLowerCase();
      if (!haystack.includes(query)) return;
    }
    group.items.push(item);
  });

  CATALOG_GROUPS.forEach((g) => {
    const rank = (item) => {
      const index = g.keys.indexOf(item.template.key);
      return index === -1 ? Infinity : index;
    };
    groupById[g.id].items.sort((a, b) => rank(a) - rank(b) || byName(a, b));
  });
  groupById[CUSTOM_GROUP.id].items.sort(byName);

  return groups.filter((g) => g.items.length > 0);
}
