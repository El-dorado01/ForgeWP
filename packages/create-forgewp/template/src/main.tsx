import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { Router } from "wouter";
import RootLayout from "./app/layout";
import AppRoutes from "./app/routes";
import "./app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root not found");
}

createRoot(root).render(
  <StrictMode>
    <HelmetProvider>
      <Router>
        <RootLayout>
          <AppRoutes />
        </RootLayout>
      </Router>
    </HelmetProvider>
  </StrictMode>,
);
