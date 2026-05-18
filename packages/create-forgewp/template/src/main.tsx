import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { StrictMode } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Router } from "wouter";
import RootLayout from "./app/layout";
import AppRoutes from "./app/routes";
import "./app/globals.css";

// Expose React and ReactDOM globally for dynamic hydration runtime
if (typeof window !== "undefined") {
  (window as any).React = React;
  (window as any).ReactDOM = ReactDOM;
}

const root = document.getElementById("root");

if (root) {
  ReactDOM.createRoot(root).render(
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
}

