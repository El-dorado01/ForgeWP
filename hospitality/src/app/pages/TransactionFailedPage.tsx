import { EddSystemPage } from '../components/EddSystemPage';

export const pageConfig = { layout: 'default' };

export default function TransactionFailedPage() {
  return (
    <EddSystemPage
      title='Zahlung nicht abgeschlossen'
      description='Informationen und nächste Schritte zu einer nicht abgeschlossenen Zahlung.'
      intro='Ihre Zahlung konnte nicht abgeschlossen werden. Bitte prüfen Sie die Bestellinformationen und folgen Sie den angezeigten nächsten Schritten.'
      slot='edd-transaction-failed'
    />
  );
}
