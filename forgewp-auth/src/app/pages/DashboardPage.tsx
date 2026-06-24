import DashboardViewWrapper from "@/components/dashboard-view-wrapper";
import { Hydrate } from "@forgewp/react";

export const pageConfig = {
  protected: true,
  redirect: 'template:login-page'
};

export function DashboardPage() {
  return (
    <Hydrate trigger="load">
      <DashboardViewWrapper />
    </Hydrate>
  );
}
