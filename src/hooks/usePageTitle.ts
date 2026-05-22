import { useEffect } from "react";

const SITE_NAME = "MeroNest";

export function usePageTitle(pageTitle: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${pageTitle} — ${SITE_NAME}`;
    return () => {
      document.title = prev;
    };
  }, [pageTitle]);
}
