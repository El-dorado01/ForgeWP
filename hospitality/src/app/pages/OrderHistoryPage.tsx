import { EddSystemPage } from '../components/EddSystemPage';

export const pageConfig = { layout: 'default' };

export default function OrderHistoryPage() {
  return (
    <EddSystemPage
      title='Bestellübersicht'
      description='Ihre Bestellungen und Lizenzdetails bei Hospitality 2035.'
      intro='Hier finden Sie Ihre bisherigen Bestellungen und die zugehörigen Lizenzinformationen.'
      slot='edd-order-history'
    />
  );
}
