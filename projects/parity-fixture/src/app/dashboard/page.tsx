import { WpRequireAuth } from '@forgewp/react';

export default function DashboardPage() {
  return (
    <WpRequireAuth redirect="/login">
      <main className="fwp-content"><h1 className="fwp-page-title" data-parity="title">Members only</h1></main>
    </WpRequireAuth>
  );
}
