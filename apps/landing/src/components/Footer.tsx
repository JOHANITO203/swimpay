import type { LandingCopy } from '../i18n';

interface FooterProps {
  copy: LandingCopy['footer'];
}

export default function Footer({ copy }: FooterProps) {
  return (
    <footer className="relative border-t border-white/6 bg-brand-900 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 px-4 sm:px-6 md:flex-row">
        <div className="flex flex-col items-center gap-4 md:items-start">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 font-display text-sm font-bold text-white">S</div>
            <span className="font-display text-xl font-bold text-white">SwimPay Merchant</span>
          </div>
          <p className="max-w-xs text-center text-sm leading-6 text-slate-500 md:text-left">{copy.description}</p>
        </div>

        <div className="flex flex-col items-center gap-5 md:items-end">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
            <a href="#" className="transition-colors hover:text-accent">{copy.privacy}</a>
            <a href="#" className="transition-colors hover:text-accent">{copy.terms}</a>
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} SwimPay. {copy.legal}</p>
        </div>
      </div>
    </footer>
  );
}
