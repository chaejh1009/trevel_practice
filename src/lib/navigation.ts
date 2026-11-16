import { useEffect, useState } from "react";

export const FIELD_IDS = ["prepare", "immigration", "hotel", "didi"] as const;
export type FieldId = (typeof FIELD_IDS)[number];
export type AppRoute =
  | { page: "hub" }
  | { page: "field"; fieldId: FieldId }
  | { page: "guide" }
  | { page: "journey" };
export function isFieldId(value: string): value is FieldId {
  return FIELD_IDS.some((id) => id === value);
}
export function parseRoute(hash: string): AppRoute {
  const path = hash.replace(/^#/, "").replace(/\/$/, "");
  if (path === "/guide") return { page: "guide" };
  if (path === "/journey") return { page: "journey" };
  const match = /^\/fields\/([^/]+)$/.exec(path);
  if (match && isFieldId(match[1])) return { page: "field", fieldId: match[1] };
  return { page: "hub" };
}
export function routeHash(route: AppRoute): string {
  return route.page === "field"
    ? `#/fields/${route.fieldId}`
    : `#/${route.page}`;
}
export function useRoute(initialRoute?: AppRoute) {
  const [route, setRoute] = useState<AppRoute>(
    () =>
      initialRoute ??
      parseRoute(typeof window === "undefined" ? "" : window.location.hash),
  );
  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const navigate = (next: AppRoute) => {
    const hash = routeHash(next);
    if (window.location.hash !== hash) window.location.hash = hash;
    setRoute(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  return { route, navigate };
}
