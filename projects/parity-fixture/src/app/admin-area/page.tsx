import { WpRequireAuth } from '@forgewp/react';

export default function AdminAreaPage() {
  return (
    <WpRequireAuth allowed="manage_options" redirect="/login">
      <main className="fwp-content"><h1 className="fwp-page-title" data-parity="title">Admins only</h1></main>
    </WpRequireAuth>
  );
}
