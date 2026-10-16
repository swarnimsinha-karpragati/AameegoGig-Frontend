import { useEffect } from "react";

export const SITE_URL = "https://workza.ai";

const setAttr = (selector, attr, value) =>
  document.querySelector(selector)?.setAttribute(attr, value);

/** Points the static head tags from public/index.html at the current marketing page (the prerender snapshots the result). */
export default function usePageMeta({ title, description, path }) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;
    document.title = title;
    setAttr('meta[name="description"]', "content", description);
    setAttr('link[rel="canonical"]', "href", url);
    setAttr('meta[property="og:title"]', "content", title);
    setAttr('meta[property="og:description"]', "content", description);
    setAttr('meta[property="og:url"]', "content", url);
    setAttr('meta[name="twitter:title"]', "content", title);
    setAttr('meta[name="twitter:description"]', "content", description);
  }, [title, description, path]);
}
