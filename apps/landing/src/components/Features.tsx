import { Calculator, CreditCard, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import type { LandingCopy } from '../i18n';

const iconStyles = [
  { icon: Zap, color: 'text-accent', bg: 'bg-accent/10' },
  { icon: CreditCard, color: 'text-blue-300', bg: 'bg-blue-400/10' },
  { icon: Calculator, color: 'text-cyan-300', bg: 'bg-cyan-400/10' },
  { icon: Users, color: 'text-indigo-300', bg: 'bg-indigo-400/10' },
];

interface FeaturesProps {
  copy: LandingCopy['features'];
}

export default function Features({ copy }: FeaturesProps) {
  return (
    <section id="features" className="relative overflow-hidden py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <motion.h2 initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-4 font-display text-4xl font-bold tracking-tight text-white">
            {copy.title}
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 }} className="text-base leading-7 text-slate-400 sm:text-lg">
            {copy.description}
          </motion.p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {copy.cards.map((feature, index) => {
            const style = iconStyles[index % iconStyles.length];
            const Icon = style.icon;
            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                viewport={{ once: true }}
                className="glass-card group relative min-h-[260px] overflow-hidden rounded-[2rem] p-7 transition-all hover:-translate-y-1 hover:border-accent/30"
              >
                <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-accent/5 blur-3xl transition-colors group-hover:bg-accent/10" />
                <div className={`relative z-10 mb-6 grid h-14 w-14 place-items-center rounded-2xl ${style.bg} ${style.color} transition-transform group-hover:scale-105`}>
                  <Icon size={28} strokeWidth={2} />
                </div>
                <h3 className="relative z-10 mb-3 font-display text-xl font-semibold leading-snug text-white">{feature.title}</h3>
                <p className="relative z-10 text-sm leading-6 text-slate-400">{feature.description}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
