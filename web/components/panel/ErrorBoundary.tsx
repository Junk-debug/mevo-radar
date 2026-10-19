import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Notice } from "@/components/ui";
import { useI18n } from "@/i18n";

function Fallback() {
  const { t } = useI18n();
  return (
    <>
      <Notice tone="error">{t("panelCrashed")}</Notice>
      <Button variant="outline" fullWidth onClick={() => window.location.reload()}>{t("reload")}</Button>
    </>
  );
}

/** Keeps a crash inside one panel, so the map and the sheet stay usable. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}
