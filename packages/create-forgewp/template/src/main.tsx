import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import RootLayout from "./app/layout";
import App from "./app/page";
import "./app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root not found");
}

createRoot(root).render(
  <StrictMode>
    <HelmetProvider>
      <RootLayout>
        <App />
      </RootLayout>
    </HelmetProvider>
  </StrictMode>,
);
