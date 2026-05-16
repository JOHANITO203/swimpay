import { Download, QrCode, Smartphone, SmartphoneNfc as SmartphoneLine } from 'lucide-react';
import { motion } from 'motion/react';
import type { LandingCopy } from '../i18n';

const androidApkUrl = import.meta.env.VITE_ANDROID_APK_URL ?? '/downloads/swimpay-merchant.apk';

interface DownloadSectionProps {
  copy: LandingCopy['download'];
}

export default function DownloadSection({ copy }: DownloadSectionProps) {
  return (
    <section id="download" className="relative overflow-hidden py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <h2 className="mb-6 font-display text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
            {copy.titleA} <br />
            <span className="text-accent">{copy.titleB}</span>
          </h2>
          <p className="mb-8 text-lg leading-8 text-slate-400">{copy.description}</p>

          <div className="space-y-4">
            {copy.bullets.map((item) => (
              <div key={item} className="flex items-center gap-4 text-slate-300">
                <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass relative rounded-[2.5rem] border-accent/20 p-7 md:p-10"
        >
          <div className="flex flex-col items-center gap-8 md:flex-row">
            <div className="w-full flex-1">
              <h3 className="mb-2 flex items-center gap-3 font-display text-2xl font-bold text-white">{copy.version}</h3>
              <p className="mb-6 text-sm text-slate-500">{copy.versionSubtitle}</p>

              <a
                href={androidApkUrl}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-accent py-5 text-xl font-bold text-brand-900 transition-all hover:shadow-[0_0_30px_rgba(0,242,255,0.3)]"
              >
                <Download size={24} />
                {copy.cta}
              </a>
            </div>

            <div className="flex flex-col items-center">
              <div className="mb-3 grid h-40 w-40 place-items-center rounded-3xl bg-white p-4">
                <QrCode size={120} className="text-brand-900" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{copy.qrLabel}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-6 border-t border-white/6 pt-8">
            <div className="flex items-center gap-2 text-slate-400 grayscale opacity-70">
              <Smartphone size={16} />
              <span className="text-xs font-medium tracking-tight">{copy.androidSupport}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 grayscale opacity-70">
              <SmartphoneLine size={16} />
              <span className="text-xs font-medium tracking-tight">{copy.apkSupport}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
