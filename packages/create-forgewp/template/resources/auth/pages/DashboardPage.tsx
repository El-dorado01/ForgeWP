import DashboardViewWrapper from "@/components/dashboard-view-wrapper";

export const pageConfig = {
  protected: true,
  redirect: 'template:login-page'
};

export function DashboardPage() {
  return (
    <DashboardViewWrapper />
  );
}
