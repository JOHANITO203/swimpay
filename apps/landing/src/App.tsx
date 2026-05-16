import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Showcase from './components/Showcase';
import TrustSection from './components/TrustSection';
import DownloadSection from './components/DownloadSection';
import Footer from './components/Footer';
import { landingTranslations, resolveLandingLocale } from './i18n';

export default function App() {
  const locale = resolveLandingLocale();
  const copy = landingTranslations[locale];

  return (
    <div className="landing-shell min-h-screen gradient-bg font-sans">
      <Navbar locale={locale} copy={copy.nav} />
      <main>
        <Hero copy={copy.hero} />
        <Features copy={copy.features} />
        <Showcase copy={copy.showcase} />
        <TrustSection copy={copy.trust} />
        <DownloadSection copy={copy.download} />
      </main>
      <Footer copy={copy.footer} />
    </div>
  );
}
