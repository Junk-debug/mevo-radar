import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { listenToBikeLinks } from "./features/bike/deepLink";
import { I18nProvider } from "./i18n";
import { useLocationStore } from "./store/location";
import "./styles/tokens.css";
import "./styles/base.css";
import "./ui/ui.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, retry: 2, refetchOnWindowFocus: true } },
});

useLocationStore.getState().init();
listenToBikeLinks();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
);
