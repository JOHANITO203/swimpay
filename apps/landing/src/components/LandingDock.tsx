import { Download, Home, LayoutGrid, ShieldCheck, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';
import type { LandingCopy } from '../i18n';

interface LandingDockProps {
  copy: LandingCopy['nav'];
}

export default function LandingDock({ copy }: LandingDockProps) {
  const items = [
    { href: '#top', label: copy.home, icon: Home },
    { href: '#features', label: copy.features, icon: LayoutGrid },
    { href: '#showcase', label: copy.app, icon: Smartphone },
    { href: '#trust', label: copy.trust, icon: ShieldCheck },
    { href: '#download', label: copy.download, icon: Download },
  ];

  return (
    <motion.nav
      aria-label={copy.dockLabel}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.5, ease: 'easeOut' }}
      className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[34rem] -translate-x-1/2 sm:bottom-6"
    >
      <div className="landing-dock flex items-center justify-between gap-1 rounded-[1.7rem] px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              className="group relative grid min-h-12 min-w-12 place-items-center rounded-[1.15rem] text-white/62 transition-all duration-200 hover:bg-white hover:text-black focus-visible:bg-white focus-visible:text-black"
              aria-label={item.label}
            >
              <Icon size={20} strokeWidth={2.2} />
              <span className="pointer-events-none absolute bottom-[calc(100%+0.55rem)] left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-white px-3 py-1.5 text-xs font-bold text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </motion.nav>
  );
}
