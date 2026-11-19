import { EddSystemPage } from '../components/EddSystemPage';

export const pageConfig = { layout: 'default' };

export default function ConfirmationPage() {
  return (
    <EddSystemPage
      title='Vielen Dank für Ihre Bestellung'
      description='Bestellbestätigung für Hospitality 2035.'
      intro='Ihre Bestellung wurde übermittelt. Die Bestelldetails finden Sie unten.'
      slot='edd-confirmation'
    />
  );
}
