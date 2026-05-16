import { Menu, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { cn } from '../lib/utils';

const navItems = [
  { href: '#features', label: 'Fonctionnalités' },
  { href: '#showcase', label: "L'application" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 flex justify-center px-4 py-4 sm:px-6">
      <motion.div
        initial={{ y: -18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="glass flex w-full max-w-6xl items-center justify-between rounded-[1.7rem] px-4 py-3 sm:px-6"
      >
        <a href="#" className="flex min-w-0 items-center gap-3" aria-label="Accueil SwimPay Merchant">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-accent font-display text-lg font-bold text-white shadow-lg shadow-accent/20">
            S
          </div>
          <span className="truncate font-display text-lg font-bold tracking-tight text-white sm:text-xl">
            SwimPay <span className="font-medium text-accent/80">Merchant</span>
          </span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="text-sm font-medium text-slate-300 transition-colors hover:text-white">
              {item.label}
            </a>
          ))}
          <a
            href="#download"
            className="rounded-full border border-accent/25 bg-accent/10 px-5 py-2.5 text-sm font-bold text-accent transition-all hover:bg-accent hover:text-brand-900"
          >
            Télécharger
          </a>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 text-white md:hidden"
          aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
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
            <a key={item.href} onClick={() => setIsOpen(false)} href={item.href} className="rounded-2xl px-3 py-3 text-base font-semibold text-white/90">
              {item.label}
            </a>
          ))}
          <a onClick={() => setIsOpen(false)} href="#download" className="mt-2 rounded-2xl bg-accent py-3 text-center font-bold text-brand-900">
            Télécharger l'app
          </a>
        </div>
      </motion.div>
    </nav>
  );
}
