import { EddSystemPage } from '../components/EddSystemPage';

export const pageConfig = { layout: 'default' };

export default function ProductsPage() {
  return (
    <EddSystemPage
      title='Lizenzen und Produkte'
      description='Übersicht der verfügbaren Hospitality 2035 Lizenzen.'
      intro='Entdecken Sie die verfügbaren Lizenzen für Hospitality 2035.'
      slot='edd-products'
    />
  );
}
