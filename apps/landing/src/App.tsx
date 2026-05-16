import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Showcase from './components/Showcase';
import TrustSection from './components/TrustSection';
import DownloadSection from './components/DownloadSection';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="landing-shell min-h-screen gradient-bg font-sans">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Showcase />
        <TrustSection />
        <DownloadSection />
      </main>
      <Footer />
    </div>
  );
}
