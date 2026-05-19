import { Download, Menu, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { landingLocalePath, landingLocales, type LandingCopy, type LandingLocale } from '../i18n';
import { cn } from '../lib/utils';
import { swimPayLandingTokens } from '../designTokens';
import BrandMark from './BrandMark';

interface NavbarProps {
  locale: LandingLocale;
  copy: LandingCopy['nav'];
}

export default function Navbar({ locale, copy }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navItems = [
    { href: '#features', label: copy.features },
    { href: '#trust', label: copy.security },
    { href: '#download', label: copy.pricing },
    { href: '#faq', label: copy.faq },
  ];

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 flex justify-center px-5 py-5 sm:px-8">
      <motion.div
        initial={false}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="flex w-full max-w-[94rem] items-center justify-between px-2 py-1"
      >
        <a href={landingLocalePath(locale)} className="flex min-w-0 items-center gap-3" aria-label="Accueil SwimPay Merchant">
          <BrandMark size="md" />
          <span className="truncate font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            SwimPay
          </span>
        </a>

        <div className="hidden items-center gap-10 md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="text-base font-semibold text-white/90 transition-colors hover:text-white">
              {item.label}
            </a>
          ))}
          <div className="flex rounded-full border border-white/10 bg-white/5 p-1">
            {landingLocales.map((item) => (
              <a
                key={item}
                href={landingLocalePath(item)}
                aria-current={item === locale ? 'page' : undefined}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-bold uppercase transition-colors',
                  item === locale ? 'bg-white text-black' : 'text-white/70 hover:text-white'
                )}
              >
                {item}
              </a>
            ))}
          </div>
          <a
            href="#download"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-black transition-all hover:shadow-[0_0_28px_rgba(255,255,255,0.22)]"
          >
            <Download size={16} />
            {copy.download}
          </a>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="grid h-11 w-11 place-items-center rounded-2xl border border-white/20 text-white md:hidden"
          aria-label={isOpen ? copy.closeMenu : copy.openMenu}
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={22} className="text-white" /> : <Menu size={22} className="text-white" />}
        </button>
      </motion.div>

      <motion.div
        initial={false}
        animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: -16 }}
        className={cn(
          'glass-dark fixed inset-x-4 top-20 rounded-3xl p-5 transition-all md:hidden',
          isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
        <div className="flex flex-col gap-2">
          {navItems.map((item) => (
            <a
              key={item.href}
              onClick={() => setIsOpen(false)}
              href={item.href}
              className="rounded-2xl px-3 py-3 text-base font-semibold text-white/90"
            >
              {item.label}
            </a>
          ))}
          <div className="flex gap-2 px-3 py-2">
            {landingLocales.map((item) => (
              <a
                key={item}
                href={landingLocalePath(item)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-bold uppercase',
                  item === locale ? 'bg-accent text-brand-900' : 'bg-white/5 text-slate-300'
                )}
              >
                {item}
              </a>
            ))}
          </div>
          <a onClick={() => setIsOpen(false)} href={swimPayLandingTokens.apkUrl} className="mt-2 rounded-2xl bg-[color:var(--sp-accent)] py-3 text-center font-bold text-[color:var(--sp-bg)]">
            {copy.downloadApp}
          </a>
        </div>
      </motion.div>
    </nav>
  );
}
