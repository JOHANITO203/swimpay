import type { LandingCopy } from '../i18n';

interface FooterProps {
  copy: LandingCopy['footer'];
}

export default function Footer({ copy }: FooterProps) {
  return (
    <footer id="faq" className="relative border-t border-white/10 bg-black py-12 pb-28">
      <div className="mx-auto flex max-w-[94rem] flex-col items-center justify-between gap-8 px-5 sm:px-8 md:flex-row">
        <div className="flex flex-col items-center gap-4 md:items-start">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-white font-display text-sm font-black text-black">S</div>
            <span className="font-display text-xl font-black text-white">SwimPay</span>
          </div>
          <p className="max-w-xs text-center text-sm leading-6 text-white/55 md:text-left">{copy.description}</p>
        </div>

        <div className="flex flex-col items-center gap-5 md:items-end">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-white/55">
            <a href="#" className="transition-colors hover:text-white">{copy.privacy}</a>
            <a href="#" className="transition-colors hover:text-white">{copy.terms}</a>
          </div>
          <p className="text-xs text-white/40">© {new Date().getFullYear()} SwimPay. {copy.legal}</p>
        </div>
      </div>
    </footer>
  );
}
