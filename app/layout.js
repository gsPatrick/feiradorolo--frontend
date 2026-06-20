import './globals.css';
import Providers from './providers';
import SiteChrome from '@/components/organisms/SiteChrome/SiteChrome';

export const metadata = {
  title: 'Feira do Rolo — O marketplace que conecta o Brasil',
  description:
    'Compre e venda com segurança no maior rolo do Brasil. Pagamento protegido, frete integrado e destaque para seus anúncios.',
  metadataBase: new URL('https://feiradorolo.com'),
};

export const viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
