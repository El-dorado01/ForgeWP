import { LegalPageTemplate } from '../components/LegalPageTemplate';
import { useWpPageLink } from '@forgewp/react';

export const pageConfig = { layout: 'default' };

export function WiderrufsbelehrungPage() {
  const withdrawalHref = useWpPageLink(
    'vertrag-widerrufen-page',
    '/vertrag-widerrufen',
  );

  return (
    <LegalPageTemplate
      slug='widerrufsbelehrung'
      title='Widerrufsbelehrung'
      description='Widerrufsbelehrung für Verbraucher bei Verträgen über die digitale Studie Hospitality 2035.'
      notice='Kundenentwurf, Stand September 2026. Vor Veröffentlichung rechtlich prüfen und an die finale elektronische Widerrufsfunktion sowie den tatsächlichen Bestellablauf anpassen.'
      sections={[
        {
          heading: 'Widerrufsrecht',
          paragraphs: [
            'Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.',
          ],
        },
        {
          heading: 'Ausübung des Widerrufsrechts',
          paragraphs: [
            'Um Ihr Widerrufsrecht auszuüben, informieren Sie uns mittels einer eindeutigen Erklärung über Ihren Entschluss, diesen Vertrag zu widerrufen. Kontakt: DICON Marketing- und Beratungsgesellschaft mbH, Reinhardtstraße 29C, 10117 Berlin, contact@dicon-beratung.de, +49 (0)30 300 132 500.',
            'Sie können die auf der Website bereitgestellte Funktion „Vertrag widerrufen“ nutzen. Bei Nutzung dieser Funktion muss DICON den Eingang unverzüglich auf einem dauerhaften Datenträger mit Inhalt, Datum und Uhrzeit bestätigen. Zur Wahrung der Widerrufsfrist reicht das rechtzeitige Absenden der Erklärung aus.',
          ],
        },
        {
          heading: 'Folgen des Widerrufs',
          paragraphs: [
            'Wenn Sie diesen Vertrag widerrufen, zahlen wir alle erhaltenen Zahlungen unverzüglich und spätestens binnen vierzehn Tagen ab Eingang der Widerrufsmitteilung zurück. Für die Rückzahlung verwenden wir grundsätzlich dasselbe Zahlungsmittel; hierfür werden keine Entgelte berechnet.',
          ],
        },
        {
          heading: 'Vorzeitiges Erlöschen bei digitalen Inhalten',
          paragraphs: [
            'Bei einem Vertrag über digitale Inhalte, die nicht auf einem körperlichen Datenträger bereitgestellt werden, kann das Widerrufsrecht vorzeitig erlöschen, wenn DICON mit der Vertragserfüllung begonnen hat, nachdem Sie:',
          ],
          bullets: [
            'ausdrücklich zugestimmt haben, dass die Vertragserfüllung vor Ablauf der Widerrufsfrist beginnt;',
            'Ihre Kenntnis davon bestätigt haben, dass Sie mit Beginn der Vertragserfüllung Ihr Widerrufsrecht verlieren; und',
            'eine Vertragsbestätigung entsprechend den gesetzlichen Anforderungen erhalten haben.',
          ],
        },
        {
          heading: 'Muster-Widerrufsformular',
          paragraphs: [
            'An DICON Marketing- und Beratungsgesellschaft mbH, Reinhardtstraße 29C, 10117 Berlin, contact@dicon-beratung.de',
            'Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag über die Bereitstellung der digitalen Studie „Hospitality 2035 – Wie sich die wirtschaftliche Logik der Hotellerie verändert“.\n\nBestellt am: ____________________\nName: ____________________\nAnschrift: ____________________\nE-Mail-Adresse: ____________________\nDatum: ____________________\nUnterschrift (nur bei Mitteilung auf Papier): ____________________',
          ],
        },
      ]}
      links={[{ label: 'Vertrag widerrufen', href: withdrawalHref }]}
    />
  );
}
