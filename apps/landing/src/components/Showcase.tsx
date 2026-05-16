import { BarChart3, CreditCard, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import type { LandingCopy } from '../i18n';

const pointIcons = [BarChart3, TrendingUp, CreditCard];

interface ShowcaseProps {
  copy: LandingCopy['showcase'];
}

export default function Showcase({ copy }: ShowcaseProps) {
  return (
    <section id="showcase" className="border-y border-white/6 bg-brand-800/35 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <h2 className="mb-7 font-display text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
            {copy.titleA} <br />
            <span className="text-accent">{copy.titleB}</span>
          </h2>
          <p className="mb-8 text-lg leading-8 text-slate-400">{copy.description}</p>

          <ul className="space-y-4">
            {copy.points.map((text, index) => {
              const Icon = pointIcons[index % pointIcons.length];
              return (
                <li key={text} className="flex items-center gap-4 font-medium text-slate-200">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
                    <Icon size={20} />
                  </div>
                  {text}
                </li>
              );
            })}
          </ul>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="relative">
          <div className="glass relative overflow-hidden rounded-[2.5rem] p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{copy.activityLabel}</p>
                <h3 className="mt-1 font-display text-2xl font-bold text-white">{copy.chartTitle}</h3>
              </div>
              <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-bold text-accent">{copy.period}</span>
            </div>

            <div className="mb-8 flex h-48 items-end justify-between gap-2">
              {[40, 25, 60, 45, 80, 55, 90, 70, 85].map((height, index) => (
                <motion.div
                  key={`${height}-${index}`}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${height}%` }}
                  transition={{ delay: index * 0.04, duration: 0.65 }}
                  viewport={{ once: true }}
                  className="flex-1 rounded-t-xl bg-gradient-to-t from-blue-600 to-accent shadow-[0_0_24px_rgba(0,242,255,0.12)]"
                />
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="glass-dark rounded-3xl p-5">
                <p className="mb-1 text-xs uppercase tracking-tight text-slate-500">{copy.totalVolume}</p>
                <p className="font-display text-2xl font-bold tracking-tight text-white">4.2M ₽</p>
                <p className="mt-1 text-xs text-green-400">{copy.weekGrowth}</p>
              </div>
              <div className="glass-dark rounded-3xl p-5">
                <p className="mb-1 text-xs uppercase tracking-tight text-slate-500">{copy.success}</p>
                <p className="font-display text-2xl font-bold tracking-tight text-white">94.2%</p>
                <p className="mt-1 text-xs text-blue-300">{copy.excellentYield}</p>
              </div>
            </div>
          </div>

          <div className="absolute left-1/2 top-1/2 -z-10 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[100px]" />
        </motion.div>
      </div>
    </section>
  );
}
