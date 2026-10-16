// Postbuild: renders the public marketing routes in jsdom and writes the resulting HTML into build/,
// so crawlers that don't execute JS get real content and links. The client hydrates it (src/index.js).
// Also the SEO regression gate: the build fails if a page's static HTML loses its content.
const fs = require("fs");
const http = require("http");
const path = require("path");
const { TextEncoder, TextDecoder } = require("util");
const { JSDOM, ResourceLoader, VirtualConsole } = require("jsdom");

const SITE = "https://workza.ai";
const BUILD = path.join(__dirname, "..", "build");
// route -> minimum words of visible content in the static HTML
const ROUTES = {
  "/": 600,
  "/solutions/blue-collar-field-hrms": 800,
  "/solutions/white-collar-office-hrms": 800,
};

const shell = fs.readFileSync(path.join(BUILD, "index.html"), "utf8");
if (!shell.includes('<div id="root"></div>')) {
  throw new Error("prerender: build/index.html is already prerendered; run `npm run build` instead");
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// SPA fallback (login, dashboards, unknown URLs) gets the untouched shell, kept out of the index.
const appShell = shell
  .replace(/<meta name="robots" content="[^"]*"\s*\/?>/, '<meta name="robots" content="noindex">')
  .replace(/<link rel="canonical"[^>]*>/, "");
if (appShell === shell) throw new Error("prerender: could not find robots/canonical tags in build/index.html");
fs.writeFileSync(path.join(BUILD, "app.html"), appShell);

const TYPES = { ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const file = path.join(BUILD, decodeURIComponent(new URL(req.url, SITE).pathname));
  if (file.startsWith(BUILD) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  } else {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(shell);
  }
});

class LocalOnlyLoader extends ResourceLoader {
  constructor(origin) {
    super();
    this.origin = origin;
  }
  fetch(url, options) {
    return url.startsWith(this.origin) ? super.fetch(url, options) : null; // skip Google Fonts etc.
  }
}

async function render(origin, route) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (e) => errors.push(e.message));
  virtualConsole.on("error", (...args) => errors.push(args.join(" ")));

  const dom = await JSDOM.fromURL(origin + route, {
    runScripts: "dangerously",
    resources: new LocalOnlyLoader(origin),
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      // Report reduced motion so animations settle at their final state (real stat numbers, no rotation).
      window.matchMedia = (query) => ({
        matches: query.includes("reduce"),
        media: query,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
      });
      window.TextEncoder = TextEncoder; // missing in jsdom 16
      window.TextDecoder = TextDecoder;
      window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollIntoView = () => {};
    },
  });

  const { document } = dom.window;
  for (let i = 0; i < 100 && !document.querySelector("#root h1"); i++) await sleep(100);
  await sleep(500); // let effects (page meta) settle
  if (!document.querySelector("#root h1")) {
    throw new Error(`prerender: ${route} never rendered an <h1>\n${errors.join("\n")}`);
  }
  // Reveal classes are added by an effect; drop them so hydration starts from React's own markup.
  document.querySelectorAll(".is-in, .lp-wait").forEach((el) => el.classList.remove("is-in", "lp-wait"));

  // Adjacent text nodes merge when HTML is reparsed; separate them like React SSR does so hydration matches.
  const walker = document.createTreeWalker(document.getElementById("root"), dom.window.NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nextSibling?.nodeType === 3) node.after(document.createComment(""));
  }

  const html = "<!doctype html>" + document.documentElement.outerHTML;
  dom.window.close();
  return html;
}

/** What a non-JS crawler sees. Returns a list of problems. */
function audit(route, html, minWords) {
  const { document } = new JSDOM(html).window;
  const root = document.getElementById("root");
  root.querySelectorAll("script").forEach((el) => el.remove());
  const words = root.textContent.trim().split(/\s+/).length;
  const links = root.querySelectorAll('a[href^="/"]').length;
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href");
  const problems = [];
  if (root.querySelectorAll("h1").length !== 1) problems.push("expected exactly one <h1>");
  if (words < minWords) problems.push(`only ${words} words (need ${minWords})`);
  if (links < 5) problems.push(`only ${links} internal <a href> links (need 5)`);
  if (canonical !== SITE + route) problems.push(`canonical is ${canonical}`);
  if (!document.querySelector('meta[name="description"]')?.content) problems.push("missing meta description");
  return { title: document.title, words, links, problems };
}

async function main() {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const titles = new Set();
  const failures = [];

  try {
    for (const [route, minWords] of Object.entries(ROUTES)) {
      const html = await render(origin, route);
      const report = audit(route, html, minWords);
      if (titles.has(report.title)) report.problems.push(`duplicate <title> "${report.title}"`);
      titles.add(report.title);

      const out = route === "/" ? "index.html" : `${route.slice(1)}.html`;
      fs.mkdirSync(path.dirname(path.join(BUILD, out)), { recursive: true });
      fs.writeFileSync(path.join(BUILD, out), html);

      console.log(`prerender: ${route} -> build/${out} (${report.words} words, ${report.links} links)`);
      report.problems.forEach((p) => failures.push(`${route}: ${p}`));
    }
  } finally {
    server.close();
  }

  if (failures.length) {
    console.error(`\nSEO check failed:\n  ${failures.join("\n  ")}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
