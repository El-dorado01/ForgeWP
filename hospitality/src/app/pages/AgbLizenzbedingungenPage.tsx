import { LegalPageTemplate } from '../components/LegalPageTemplate';
import { useWpPageLink } from '@forgewp/react';

export const pageConfig = { layout: 'default' };

export function AgbLizenzbedingungenPage() {
  const withdrawalHref = useWpPageLink(
    'widerrufsbelehrung-page',
    '/widerrufsbelehrung',
  );

  return (
    <LegalPageTemplate
      slug='agb-lizenzbedingungen'
      title='Allgemeine Geschäfts- und Lizenzbedingungen'
      description='Arbeitsfassung der Geschäfts- und Lizenzbedingungen für die Studie Hospitality 2035.'
      notice='Kundenentwurf, Stand September 2026. Vor Veröffentlichung rechtlich prüfen lassen; Preise und Bestellablauf mit den finalen Produkt- und Zahlungsbedingungen abgleichen.'
      sections={[
        {
          heading: '1. Anbieter und Geltungsbereich',
          paragraphs: [
            'Diese Bedingungen gelten für Erwerb und Nutzung der digitalen Studie „Hospitality 2035 – Wie sich die wirtschaftliche Logik der Hotellerie verändert“ über die Website von DICON Marketing- und Beratungsgesellschaft mbH, Reinhardtstraße 29C, 10117 Berlin. Geschäftsführer: Dipl.-Volkswirt Roland Schwecke. E-Mail: contact@dicon-beratung.de. Telefon: +49 (0)30 300 132 500. Registergericht: Amtsgericht Berlin-Charlottenburg. HRB 933399 B. USt-IdNr.: DE235630864.',
            'Sie gelten gegenüber Unternehmern und Verbrauchern. Verbraucher handeln überwiegend außerhalb ihrer gewerblichen oder selbständigen beruflichen Tätigkeit; Unternehmer handeln bei Vertragsschluss in Ausübung dieser Tätigkeit.',
          ],
        },
        {
          heading: '2. Vertragsgegenstand',
          paragraphs: [
            'Vertragsgegenstand ist die entgeltliche Bereitstellung der Studie als digitale Publikation im PDF-Format sowie die Einräumung der Nutzungsrechte im Umfang der erworbenen Lizenz. Urheberrechte werden nicht übertragen.',
          ],
        },
        {
          heading: '3. Lizenzmodelle',
          bullets: [
            'Single License – 249 € netto: Nutzungsrecht für eine natürliche Person.',
            'Team License – 1.490 € netto: Nutzungsrecht für bis zu 10 Personen innerhalb derselben Organisation.',
            'Corporate License – ab 2.490 € netto: individueller Nutzungsumfang und Preis für größere Teams und Organisationen.',
          ],
          paragraphs: [
            'Soweit Verbraucherpreise angeboten werden, ist der gesetzlich erforderliche Gesamtpreis einschließlich Umsatzsteuer auszuweisen.',
          ],
        },
        {
          heading: '4. Vertragsschluss',
          paragraphs: [
            'Die Darstellung der Lizenzmodelle ist kein rechtlich bindendes Angebot. Mit Abschluss eines Online-Bestellvorgangs gibt der Kunde ein verbindliches Angebot ab. Bei Team- und Corporate-Lizenzen stellt eine Anfrage noch keinen Vertragsschluss dar; der Vertrag entsteht durch ein gesondertes Angebot und dessen Annahme.',
          ],
        },
        {
          heading: '5. Preise und Zahlung',
          paragraphs: [
            'Es gelten die im Zeitpunkt der Bestellung ausgewiesenen Preise. Die Single License kann über die im Bestellprozess angebotenen Zahlungsarten bezahlt werden. Für Team- und Corporate-Lizenzen können gesonderte Zahlungsmodalitäten vereinbart werden.',
          ],
        },
        {
          heading: '6. Bereitstellung der Studie',
          paragraphs: [
            'Nach erfolgreichem Bestell- und Zahlungsvorgang wird die Studie elektronisch bereitgestellt, etwa über einen Download-Link oder per E-Mail. Ausgelieferte Exemplare können eine individuelle Lizenznummer oder sonstige Kennzeichnung tragen; diese darf nicht entfernt, verändert oder unkenntlich gemacht werden.',
          ],
        },
        {
          heading: '7. Nutzungsrechte',
          paragraphs: [
            'Nach vollständiger Zahlung erhält der Kunde ein einfaches, nicht ausschließliches und nicht übertragbares Nutzungsrecht im Umfang der erworbenen Lizenz. Die Nutzung ist auf den lizenzierten Nutzerkreis beschränkt.',
          ],
          bullets: [
            'Weitergabe der vollständigen Studie oder wesentlicher Teile außerhalb des lizenzierten Nutzerkreises;',
            'öffentliche Zugänglichmachung, insbesondere auf frei zugänglichen Websites, Plattformen, Datenbanken oder sozialen Netzwerken;',
            'Weiterverkauf oder sonstige kommerzielle Verbreitung;',
            'Vervielfältigung und Verbreitung vollständiger oder wesentlicher Teile außerhalb des lizenzierten Nutzerkreises;',
            'Entfernung oder Veränderung von Lizenznummern, Copyright- oder Herkunftshinweisen.',
          ],
        },
        {
          heading: '8. Urheberrecht',
          paragraphs: [
            'Texte, Analysen, Tabellen, Grafiken, Abbildungen, Modelle und sonstige Inhalte sind urheberrechtlich geschützt, soweit nicht ausdrücklich anders angegeben. Alle nicht ausdrücklich eingeräumten Rechte bleiben DICON und den jeweiligen Rechteinhabern vorbehalten. © DICON Marketing- und Beratungsgesellschaft mbH / Hospitality 2035.',
          ],
        },
        {
          heading: '9. Inhalt der Studie',
          paragraphs: [
            'Die Studie beruht auf den zum Erstellungszeitpunkt verfügbaren Informationen, Daten, Analysen und Einschätzungen. Zukunftsaussagen und Szenarien garantieren keine tatsächliche Entwicklung. Die Studie ist keine individuelle Investitions-, Rechts-, Steuer- oder Finanzierungsberatung.',
          ],
        },
        {
          heading: '10. Mängelrechte und Haftung',
          paragraphs: [
            'Für Verbraucher gelten die gesetzlichen Mängelrechte für digitale Produkte. DICON haftet unbeschränkt bei Verletzung von Leben, Körper oder Gesundheit sowie bei Vorsatz und grober Fahrlässigkeit. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung, soweit gesetzlich zulässig, auf den vertragstypischen vorhersehbaren Schaden begrenzt. Zwingende gesetzliche Haftungsvorschriften bleiben unberührt.',
          ],
        },
        {
          heading: '11. Widerrufsrecht für Verbraucher',
          paragraphs: [
            'Verbrauchern steht grundsätzlich ein gesetzliches Widerrufsrecht zu. Einzelheiten enthält die gesonderte Widerrufsbelehrung. Bei digitalen Inhalten kann das Widerrufsrecht unter den gesetzlichen Voraussetzungen vorzeitig erlöschen.',
          ],
        },
        {
          heading: '12. Anwendbares Recht',
          paragraphs: [
            'Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Bei Verbrauchern gilt diese Rechtswahl nur, soweit ihnen dadurch nicht der Schutz zwingender Bestimmungen ihres Aufenthaltsstaats entzogen wird.',
          ],
        },
        {
          heading: '13. Gerichtsstand',
          paragraphs: [
            'Ist der Kunde Kaufmann, eine juristische Person des öffentlichen Rechts oder ein öffentlich-rechtliches Sondervermögen, ist – soweit gesetzlich zulässig – der Sitz von DICON Gerichtsstand. Für Verbraucher gelten die gesetzlichen Gerichtsstandsregelungen.',
          ],
        },
        {
          heading: '14. Schlussbestimmungen',
          paragraphs: [
            'Individuelle Vereinbarungen haben Vorrang. Sollten einzelne Bestimmungen unwirksam sein oder werden, bleiben die übrigen Bestimmungen unberührt. Stand: September 2026.',
          ],
        },
      ]}
      links={[{ label: 'Widerrufsbelehrung', href: withdrawalHref }]}
    />
  );
}
