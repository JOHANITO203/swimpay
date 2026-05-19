import Navbar from './components/Navbar';
import Hero from './components/Hero';
import BentoFeatures from './components/BentoFeatures';
import Showcase from './components/Showcase';
import TrustSection from './components/TrustSection';
import DownloadSection from './components/DownloadSection';
import Footer from './components/Footer';
import LandingDock from './components/LandingDock';
import { landingTranslations, resolveLandingLocale } from './i18n';
import { useEffect } from 'react';
import { applyLandingMetadata } from './seo';

export default function App() {
  const locale = resolveLandingLocale();
  const copy = landingTranslations[locale];

  useEffect(() => {
    applyLandingMetadata(locale);
  }, [locale]);

  return (
    <div id="top" className="landing-shell min-h-screen gradient-bg font-sans">
      <Navbar locale={locale} copy={copy.nav} />
      <main>
        <Hero copy={copy.hero} />
        <BentoFeatures copy={copy.features} />
        <Showcase copy={copy.showcase} />
        <TrustSection copy={copy.trust} />
        <DownloadSection copy={copy.download} />
      </main>
      <LandingDock copy={copy.nav} />
      <Footer copy={copy.footer} />
    </div>
  );
}
