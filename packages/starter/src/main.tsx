import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { Router, Route, Switch } from "wouter";
import RootLayout from "./app/layout";
import HomePage from "./app/page";
import SinglePage from "./app/single";
import NotFoundPage from "./app/404";
import "./app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root not found");
}

createRoot(root).render(
  <StrictMode>
    <HelmetProvider>
      <RootLayout>
        <Router>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/post" component={SinglePage} />
            <Route path="/post/:slug" component={SinglePage} />
            <Route component={NotFoundPage} />
          </Switch>
        </Router>
      </RootLayout>
    </HelmetProvider>
  </StrictMode>,
);
