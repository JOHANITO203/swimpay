import { CheckCircle2, ChevronRight, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { swimPayLandingTokens } from '../designTokens';
import type { LandingCopy } from '../i18n';

const androidApkUrl = swimPayLandingTokens.apkUrl;
const dashboardScreenshotUrl = '/images/swimpay-dashboard-dark-home.png';

interface HeroProps {
  copy: LandingCopy['hero'];
}

export default function Hero({ copy }: HeroProps) {
  return (
    <section className="relative overflow-hidden px-3 pb-3 pt-24 sm:px-8">
      <div className="hero-panel mx-auto grid min-h-[42rem] w-full max-w-[94rem] items-center gap-10 overflow-hidden rounded-[1.9rem] px-4 py-12 sm:px-12 sm:py-16 lg:grid-cols-[1.02fr_0.98fr] lg:px-16">
        <motion.div
          initial={false}
          animate={{ x: 0 }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
          className="relative z-10"
        >
          <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-black/60 sm:text-xs sm:tracking-[0.18em]">
            <span className="h-2 w-2 rounded-full bg-black" />
            {copy.badge}
          </div>

          <h1 className="mb-7 max-w-4xl font-display text-[2.35rem] font-black leading-[1] tracking-tight text-black sm:text-6xl lg:text-7xl xl:text-8xl">
            {copy.titleA} <br />
            <span>{copy.titleB}</span>
          </h1>

          <p className="mb-9 max-w-2xl text-base leading-7 text-black/70 sm:text-xl sm:leading-8">
            {copy.description}{' '}
            <span className="whitespace-nowrap rounded-full border border-black/10 bg-white px-3 py-1 font-semibold text-black">
              {copy.freeBadge}
            </span>
          </p>

          <div className="flex w-full max-w-full min-w-0 flex-col gap-3 overflow-hidden sm:w-auto sm:flex-row sm:overflow-visible">
            <a
              href={androidApkUrl}
              className="group flex min-h-14 w-full min-w-0 max-w-[calc(100vw-4.5rem)] items-center justify-center gap-2 rounded-xl bg-black px-3 py-4 text-center text-[13px] font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.22)] sm:w-auto sm:max-w-none sm:px-7 sm:text-base"
            >
              <Download size={20} className="transition-transform group-hover:-translate-y-0.5" />
              <span className="min-w-0 leading-tight sm:hidden">{copy.primaryCta.replace(' Merchant', '')}</span>
              <span className="hidden min-w-0 leading-tight sm:inline">{copy.primaryCta}</span>
            </a>
            <a
              href="#features"
              className="flex min-h-14 w-full min-w-0 max-w-[calc(100vw-4.5rem)] items-center justify-center gap-2 rounded-xl border border-black/25 bg-white px-4 py-4 text-center text-sm font-bold text-black transition-all hover:bg-black/[0.04] sm:w-auto sm:max-w-none sm:px-7 sm:text-base"
            >
              <span className="min-w-0 leading-tight">{copy.secondaryCta}</span>
              <ChevronRight size={20} />
            </a>
          </div>

          <div className="mt-12 grid gap-5 text-sm text-black/75 sm:grid-cols-3">
            {copy.proofs.map((proof) => (
              <div key={proof.title} className="flex items-start gap-3">
                <CheckCircle2 size={21} className="mt-0.5 shrink-0 text-black" />
                <div>
                  <p className="font-bold text-black">{proof.title}</p>
                  <p className="text-xs leading-5 text-black/55">{proof.description}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={false}
          animate={{ opacity: 1, scale: 1, rotate: -6, y: 0 }}
          transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex scale-90 justify-center sm:scale-100 lg:justify-end"
        >
          <div className="phone-shadow absolute bottom-0 h-8 w-[19rem] translate-y-5 rounded-full bg-black/20 blur-xl" />
          <div className="phone-shell relative h-[620px] w-[298px] rounded-[3.2rem] border border-black/30 bg-[#050505] p-[11px] shadow-[0_42px_105px_rgba(0,0,0,0.38)] ring-[7px] ring-black/10 sm:h-[650px] sm:w-[312px]">
            <div className="absolute -right-[7px] top-40 h-24 w-[5px] rounded-r-full bg-gradient-to-b from-black/50 via-white/20 to-black/70" />
            <div className="absolute -left-[5px] top-32 h-14 w-[4px] rounded-l-full bg-black/45" />
            <div className="absolute -left-[5px] top-52 h-20 w-[4px] rounded-l-full bg-black/45" />
            <div className="absolute left-1/2 top-[15px] z-20 h-[5px] w-16 -translate-x-1/2 rounded-full bg-black/75 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" />
            <div className="relative h-full overflow-hidden rounded-[2.45rem] border border-white/10 bg-black">
              <img
                src={dashboardScreenshotUrl}
                alt="Accueil SwimPay Merchant en thème sombre"
                className="h-full w-full object-fill"
                loading="eager"
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.05)_18%,transparent_42%)] mix-blend-screen" />
              <div className="pointer-events-none absolute inset-0 rounded-[2.45rem] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_-30px_60px_rgba(0,0,0,0.28)]" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
