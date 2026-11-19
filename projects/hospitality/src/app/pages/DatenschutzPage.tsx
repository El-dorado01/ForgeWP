import { LegalPageTemplate } from '../components/LegalPageTemplate';

export const pageConfig = { layout: 'default' };

export function DatenschutzPage() {
  return (
    <LegalPageTemplate
      slug='datenschutz'
      title='Datenschutzerklärung'
      description='Informationen zur Verarbeitung personenbezogener Daten auf der Hospitality-2035-Website.'
      notice='Arbeitsstruktur, keine freigegebene Datenschutzerklärung. Hosting, Formulare, Zahlungsdienste, Cookies und Auftragsverarbeiter müssen anhand der tatsächlich eingesetzten Systeme ergänzt und rechtlich geprüft werden.'
      sections={[
        {
          heading: 'Verantwortlicher',
          paragraphs: [
            'Verantwortlich für die Verarbeitung personenbezogener Daten ist die DICON Marketing- und Beratungsgesellschaft mbH, Reinhardtstraße 29C, 10117 Berlin. Kontakt: contact@dicon-beratung.de, +49 (0)30 300 132 500.',
          ],
        },
        {
          heading: 'Besuch der Website und Server-Logfiles',
          paragraphs: [
            'Vor Veröffentlichung sind Hosting-Anbieter, Serverstandort, verarbeitete Protokolldaten, Rechtsgrundlage und Speicherdauer anhand des tatsächlichen Hosting-Vertrags einzutragen.',
          ],
        },
        {
          heading: 'Kontakt- und Lizenzanfragen',
          paragraphs: [
            'Team- und Unternehmenslizenz-Anfragen werden über native WordPress-Formulare an contact@dicon-beratung.de übermittelt. Die Anfrageangaben werden zusätzlich im geschützten WordPress-Formulareingang gespeichert, auf den Personen mit der Berechtigung manage_options zugreifen können. Das System versendet eine Eingangsbestätigung an die angegebene E-Mail-Adresse; die tatsächliche Zustellung hängt vom E-Mail-Transport der WordPress-Installation ab. Gespeicherte Anfragen sind derzeit so konfiguriert, dass sie nach 180 Tagen automatisch gelöscht werden. Vor Veröffentlichung sind Rechtsgrundlage, Empfänger- und Hosting-Verträge, tatsächliche Zugriffskreise sowie diese Speicherfrist mit der verantwortlichen Stelle und datenschutzrechtlich zu prüfen.',
          ],
        },
        {
          heading: 'Veranstaltungsanmeldungen',
          paragraphs: [
            'Eine Anmeldung zu den Veranstaltungen ist derzeit nicht implementiert. Vor Aktivierung sind Formularfelder, Teilnehmerverwaltung, Bestätigungs-E-Mails, Kapazitätsablauf, Speicherdauer und ein etwaiger Foto-/Videoeinsatz konkret zu beschreiben. Marketingeinwilligungen müssen getrennt und freiwillig sein.',
          ],
        },
        {
          heading: 'Bestellung und Zahlungsabwicklung',
          paragraphs: [
            'EDD und Stripe sind derzeit nicht angeschlossen. Vor Freischaltung des Verkaufs sind die tatsächlich beteiligten Zahlungs- und Versanddienstleister, Datenübermittlungen, Rechtsgrundlagen und Speicherdauern einschließlich möglicher Drittlandübermittlungen zu ergänzen.',
          ],
        },
        {
          heading: 'Cookies, Analyse und externe Inhalte',
          paragraphs: [
            'Vor Veröffentlichung sind alle tatsächlich eingesetzten Cookies, Analyse-/Marketingdienste und externen Inhalte zu erfassen. Zustimmungspflichtige Dienste dürfen erst nach entsprechender Einwilligung geladen werden.',
          ],
        },
        {
          heading: 'Ihre Rechte und Beschwerderecht',
          paragraphs: [
            'Informationen zu Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch und Widerruf einer Einwilligung sowie die zuständige Datenschutzaufsichtsbehörde sind vor Freigabe mit der verantwortlichen Stelle abzustimmen.',
          ],
        },
      ]}
    />
  );
}
