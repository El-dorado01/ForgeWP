import { EddSystemPage } from '../components/EddSystemPage';

export const pageConfig = { layout: 'default' };

export default function CheckoutPage() {
  return (
    <EddSystemPage
      title='Checkout'
      description='Sicherer Checkout für Hospitality 2035.'
      intro='Prüfen Sie Ihre Bestellung und geben Sie Ihre Zahlungsdaten sicher ein.'
      slot='edd-checkout'
    />
  );
}
