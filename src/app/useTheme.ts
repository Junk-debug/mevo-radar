import { useEffect, useState } from "react";

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

export function useTheme(): "light" | "dark" {
  const [dark, setDark] = useState(darkQuery.matches);
  useEffect(() => {
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    darkQuery.addEventListener("change", onChange);
    return () => darkQuery.removeEventListener("change", onChange);
  }, []);
  return dark ? "dark" : "light";
}
