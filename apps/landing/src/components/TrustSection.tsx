import { ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import type { LandingCopy } from '../i18n';

interface TrustSectionProps {
  copy: LandingCopy['trust'];
}

export default function TrustSection({ copy }: TrustSectionProps) {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass relative mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] p-8 text-center sm:p-12"
        >
          <div className="absolute left-1/2 top-0 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[60px]" />

          <div className="mx-auto mb-7 grid h-20 w-20 place-items-center rounded-3xl border border-accent/20 bg-accent/10 text-accent">
            <ShieldCheck size={40} />
          </div>

          <h2 className="mb-5 font-display text-3xl font-bold tracking-tight text-white md:text-4xl">{copy.title}</h2>

          <p className="mx-auto max-w-2xl text-lg leading-8 text-slate-400 md:text-xl">
            {copy.descriptionA} <br className="hidden md:block" /> {copy.descriptionB}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            {copy.chips.map((chip, index) => (
              <span key={chip} className={index % 2 === 1 ? 'text-accent/80' : undefined}>
                {chip}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
