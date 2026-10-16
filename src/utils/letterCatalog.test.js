import { buildLetterCatalog, describeTemplate, filterIssuableTemplates, findTemplateByKey, letterNameForKey, CATALOG_GROUPS, CATEGORY_GROUP, GROUP_OPTIONS, LETTER_DESCRIPTIONS, OFFER_TEMPLATE_KEY, groupLabelForCategory, templateGroup } from "./letterCatalog";
import { TEMPLATE_CATEGORIES } from "./letterForms";

const tpl = (key, overrides = {}) => ({
  _id: `id-${key}`,
  key,
  name: overrides.name || `${key} letter`,
  category: "general",
  recipientType: "employee",
  status: "active",
  isSystem: true,
  ...overrides,
});

const ids = (catalog) => catalog.map((g) => g.id);
const keysOf = (group) => group.items.map((i) => i.template.key);

describe("CATALOG_GROUPS", () => {
  it("lists groups in the agreed order", () => {
    expect(CATALOG_GROUPS.map((g) => g.id)).toEqual(["joining", "during", "disciplinary", "leaving", "consultants"]);
  });

  it("has a description for every grouped key", () => {
    CATALOG_GROUPS.flatMap((g) => g.keys).forEach((key) => {
      expect(LETTER_DESCRIPTIONS[key]).toEqual(expect.any(String));
    });
  });
});

describe("group model", () => {
  it("maps every saved category to a catalog group", () => {
    expect(CATEGORY_GROUP).toEqual({
      Onboarding: "joining",
      "Employment changes": "during",
      Disciplinary: "disciplinary",
      Exit: "leaving",
      Consultancy: "consultants",
      Custom: "custom",
    });
  });

  it("offers one Group option per saved category, labelled like the home grid", () => {
    expect(GROUP_OPTIONS).toEqual([
      { value: "Onboarding", label: "Joining" },
      { value: "Employment changes", label: "During employment" },
      { value: "Disciplinary", label: "Disciplinary" },
      { value: "Exit", label: "Leaving" },
      { value: "Consultancy", label: "Consultants" },
      { value: "Custom", label: "Your templates" },
    ]);
    expect(GROUP_OPTIONS.map((o) => o.value)).toEqual(TEMPLATE_CATEGORIES);
  });

  it("groups built-ins by key and everything else by category", () => {
    expect(templateGroup(tpl("experience", { category: "Custom" })).label).toBe("Your templates");
    expect(templateGroup(tpl("warning", { category: "Exit" })).label).toBe("Leaving");
    expect(templateGroup(tpl("experience", { category: "unknown" })).label).toBe("Leaving");
    expect(templateGroup(tpl("experience", { category: undefined })).label).toBe("Leaving");
    expect(templateGroup(tpl("my-exit", { category: "Exit" })).label).toBe("Leaving");
    expect(templateGroup(tpl("x", { category: "unknown" })).id).toBe("custom");
    expect(templateGroup(null).id).toBe("custom");
    expect(groupLabelForCategory("Onboarding")).toBe("Joining");
    expect(groupLabelForCategory("nope")).toBe("Your templates");
  });
});

describe("buildLetterCatalog", () => {
  it("groups templates in CATALOG_GROUPS order and each group's key order", () => {
    const catalog = buildLetterCatalog([
      tpl("experience"),
      tpl("appointment"),
      tpl("offer"),
      tpl("warning"),
      tpl("relieving"),
      tpl("promotion"),
      tpl("consultancy-agreement"),
    ]);
    expect(ids(catalog)).toEqual(["joining", "during", "disciplinary", "leaving", "consultants"]);
    expect(keysOf(catalog[0])).toEqual(["offer", "appointment"]);
    expect(keysOf(catalog[3])).toEqual(["relieving", "experience"]);
    expect(catalog[0].label).toBe("Joining");
  });

  it("attaches the plain-language description to each item", () => {
    const [group] = buildLetterCatalog([tpl("offer")]);
    expect(group.items[0].description).toBe("Offer a job to a selected candidate");
  });

  it("omits empty groups", () => {
    expect(ids(buildLetterCatalog([tpl("noc")]))).toEqual(["during"]);
  });

  it("excludes archived templates but treats missing status as active", () => {
    const catalog = buildLetterCatalog([tpl("offer", { status: "archived" }), tpl("internship", { status: undefined })]);
    expect(keysOf(catalog[0])).toEqual(["internship"]);
  });

  it("puts unknown keys in a 'Your templates' group sorted by name, after the standard groups", () => {
    const catalog = buildLetterCatalog([
      tpl("zeta-custom", { name: "Zeta notice" }),
      tpl("offer"),
      tpl("alpha-custom", { name: "alpha memo" }),
      tpl(undefined, { name: "Mid letter" }),
    ]);
    expect(ids(catalog)).toEqual(["joining", "custom"]);
    expect(catalog[1].label).toBe("Your templates");
    expect(catalog[1].items.map((i) => i.template.name)).toEqual(["alpha memo", "Mid letter", "Zeta notice"]);
  });

  it("groups templates without a catalog key by their saved group (category)", () => {
    const catalog = buildLetterCatalog([
      tpl("exit-interview", { name: "Exit interview", category: "Exit", isSystem: false }),
      tpl("bank-noc", { name: "Bank NOC", category: "Custom", isSystem: false }),
      tpl("experience"),
    ]);
    expect(ids(catalog)).toEqual(["leaving", "custom"]);
    expect(keysOf(catalog[0])).toEqual(["experience", "exit-interview"]);
  });

  it("returns an empty list for no templates", () => {
    expect(buildLetterCatalog([])).toEqual([]);
    expect(buildLetterCatalog(undefined)).toEqual([]);
  });

  describe("search", () => {
    const templates = [
      tpl("offer", { name: "Offer Letter" }),
      tpl("experience", { name: "Experience Certificate" }),
      tpl("warning", { name: "Warning Letter" }),
      tpl("custom-x", { name: "Bonus memo", description: "Annual bonus payout" }),
    ];

    it("matches template name case-insensitively", () => {
      const catalog = buildLetterCatalog(templates, { search: "EXPERIENCE" });
      expect(ids(catalog)).toEqual(["leaving"]);
      expect(keysOf(catalog[0])).toEqual(["experience"]);
    });

    it("matches the item description", () => {
      expect(ids(buildLetterCatalog(templates, { search: "conduct" }))).toEqual(["disciplinary"]);
      expect(ids(buildLetterCatalog(templates, { search: "payout" }))).toEqual(["custom"]);
    });

    it("matches the group label", () => {
      const catalog = buildLetterCatalog(templates, { search: "joining" });
      expect(ids(catalog)).toEqual(["joining"]);
      expect(ids(buildLetterCatalog(templates, { search: "your templates" }))).toEqual(["custom"]);
    });

    it("ignores surrounding whitespace and treats whitespace-only as no filter", () => {
      expect(ids(buildLetterCatalog(templates, { search: "   " }))).toHaveLength(4);
      expect(ids(buildLetterCatalog(templates, { search: "  warning  " }))).toEqual(["disciplinary"]);
    });

    it("returns an empty list when nothing matches", () => {
      expect(buildLetterCatalog(templates, { search: "zzz" })).toEqual([]);
    });
  });
});

describe("describeTemplate", () => {
  it("prefers the standard description for known keys", () => {
    expect(describeTemplate(tpl("noc", { description: "custom text" }))).toBe(LETTER_DESCRIPTIONS.noc);
  });

  it("falls back to the template's own description", () => {
    expect(describeTemplate(tpl("bonus", { description: "Annual bonus payout" }))).toBe("Annual bonus payout");
  });

  it("falls back to the group label, never the raw category", () => {
    expect(describeTemplate(tpl("bonus", { category: "Exit" }))).toBe("Leaving letter");
    expect(describeTemplate(tpl("bonus", { category: "Employment changes" }))).toBe("During employment letter");
    expect(describeTemplate(tpl("bonus", { category: "Custom" }))).toBe("Letter");
    expect(describeTemplate(tpl("bonus", { category: "compensation" }))).toBe("Letter");
  });

  it("never shows 'undefined' when category is missing", () => {
    expect(describeTemplate({ key: "x", name: "X" })).toBe("Letter");
  });
});

describe("filterIssuableTemplates", () => {
  const list = [
    tpl("offer", { recipientType: "candidate" }),
    tpl("warning"),
    tpl("consultancy-agreement", { recipientRule: "consultancy" }),
    tpl("agreement-copy", { recipientRule: "consultancy" }),
    tpl("noc", { status: "archived" }),
  ];

  it("keeps every active template without restrictions", () => {
    const all = ["offer", "warning", "consultancy-agreement", "agreement-copy"];
    expect(filterIssuableTemplates(list).map((t) => t.key)).toEqual(all);
    expect(filterIssuableTemplates(list, { recipientRule: null, recipientType: "" }).map((t) => t.key)).toEqual(all);
  });

  it("limits to templates under the given recipient rule, copies included, whatever their key", () => {
    expect(filterIssuableTemplates(list, { recipientRule: "consultancy" }).map((t) => t.key)).toEqual([
      "consultancy-agreement",
      "agreement-copy",
    ]);
  });

  it("limits to the recipient type", () => {
    expect(filterIssuableTemplates(list, { recipientType: "candidate" }).map((t) => t.key)).toEqual(["offer"]);
  });

  it("combines both and handles missing input", () => {
    expect(filterIssuableTemplates(list, { recipientRule: "consultancy", recipientType: "candidate" })).toEqual([]);
    expect(filterIssuableTemplates(undefined)).toEqual([]);
    expect(filterIssuableTemplates([null, tpl("warning")]).map((t) => t.key)).toEqual(["warning"]);
  });
});

describe("findTemplateByKey", () => {
  it("finds the active template with the key", () => {
    expect(findTemplateByKey([tpl("offer", { _id: "a", status: "archived" }), tpl("offer", { _id: "b" })], OFFER_TEMPLATE_KEY)?._id).toBe("b");
  });

  it("returns null when there is none", () => {
    expect(findTemplateByKey([tpl("warning")], "offer")).toBeNull();
    expect(findTemplateByKey(undefined, "offer")).toBeNull();
    expect(findTemplateByKey([tpl("offer")], "")).toBeNull();
  });
});

describe("letterNameForKey", () => {
  it("names every grouped key in plain words", () => {
    CATALOG_GROUPS.flatMap((g) => g.keys).forEach((key) => expect(letterNameForKey(key)).toEqual(expect.any(String)));
    expect(letterNameForKey(OFFER_TEMPLATE_KEY)).toBe("offer letter");
  });

  it("returns an empty string for unknown or empty keys", () => {
    expect(letterNameForKey("custom-bank")).toBe("");
    expect(letterNameForKey("")).toBe("");
    expect(letterNameForKey(undefined)).toBe("");
  });
});

describe("saved Group decides placement", () => {
  // Seeded categories from the backend defaultTemplates.js.
  const SEEDED = {
    offer: "Onboarding", appointment: "Onboarding", internship: "Onboarding",
    confirmation: "Employment changes", promotion: "Employment changes", increment: "Employment changes",
    transfer: "Employment changes", "employment-verification": "Employment changes", noc: "Employment changes",
    warning: "Disciplinary", "show-cause": "Disciplinary",
    termination: "Exit", experience: "Exit", relieving: "Exit",
    "consultancy-agreement": "Consultancy",
  };

  it("keeps every seeded template in its default group", () => {
    CATALOG_GROUPS.forEach((group) =>
      group.keys.forEach((key) => expect([key, templateGroup(tpl(key, { category: SEEDED[key] })).id]).toEqual([key, group.id]))
    );
    expect(Object.keys(SEEDED).sort()).toEqual(CATALOG_GROUPS.flatMap((g) => g.keys).sort());
  });

  it("moves a built-in template whose Group was changed, after that group's own templates", () => {
    const catalog = buildLetterCatalog([
      tpl("warning", { category: "Exit" }),
      tpl("show-cause", { category: "Disciplinary" }),
      tpl("relieving", { category: "Exit" }),
    ]);
    expect(ids(catalog)).toEqual(["disciplinary", "leaving"]);
    expect(keysOf(catalog[1])).toEqual(["relieving", "warning"]);
  });
});
