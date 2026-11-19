import { EddSystemPage } from '../components/EddSystemPage';

export const pageConfig = { layout: 'default' };

export default function ReceiptPage() {
  return (
    <EddSystemPage
      title='Bestellbestätigung'
      description='Details zu Ihrer Bestellung bei Hospitality 2035.'
      intro='Die folgenden Angaben beziehen sich auf Ihre Bestellung.'
      slot='edd-receipt'
    />
  );
}
