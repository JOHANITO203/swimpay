import type { LucideIcon } from 'lucide-react';
import { Calculator, CreditCard, ShieldCheck, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import type { LandingCopy } from '../i18n';
import { cn } from '../lib/utils';

interface BentoFeature {
  title: string;
  description: string;
  meta: string;
  status: string;
  tags: string[];
  icon: LucideIcon;
  colSpan?: 2;
  persistent?: boolean;
}

interface BentoFeaturesProps {
  copy: LandingCopy['features'];
}

const icons = [Zap, CreditCard, Calculator, Users, ShieldCheck] as const;

export default function BentoFeatures({ copy }: BentoFeaturesProps) {
  const items: BentoFeature[] = copy.cards.map((card, index) => ({
    ...card,
    icon: icons[index % icons.length],
    colSpan: index === 0 || index === 3 ? 2 : undefined,
    persistent: index === 0,
  }));

  return (
    <section id="features" className="relative overflow-hidden py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-white/55"
          >
            {copy.eyebrow}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 font-display text-4xl font-black tracking-tight text-white md:text-5xl"
          >
            {copy.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="text-base leading-7 text-white/62 sm:text-lg"
          >
            {copy.description}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.42, ease: 'easeOut' }}
                viewport={{ once: true }}
                className={cn(
                  'group relative min-h-[15rem] overflow-hidden rounded-[1.65rem] p-5 transition-all duration-300 will-change-transform',
                  'border border-[color:var(--sp-line)] bg-[color:var(--sp-card)] shadow-[var(--sp-shadow-card)]',
                  'hover:-translate-y-1 hover:border-[color:var(--sp-accent-soft)] hover:shadow-[var(--sp-shadow-float)]',
                  item.colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1',
                  index === 4 ? 'bg-[#0b0b0b] text-white' : '',
                  item.persistent ? '-translate-y-1 border-[color:var(--sp-accent-soft)] shadow-[var(--sp-shadow-float)]' : ''
                )}
              >
                <div
                  className={cn(
                    'absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100',
                    item.persistent ? 'opacity-100' : ''
                  )}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--sp-dot)_1px,transparent_1px)] bg-[length:5px_5px]" />
                  <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[color:var(--sp-accent-glow)] blur-3xl" />
                </div>

                <div className="relative flex h-full flex-col justify-between gap-7">
                  <div className="flex items-center justify-between gap-3">
                    <div className={cn('grid h-11 w-11 place-items-center rounded-2xl', index === 4 ? 'bg-white/10 text-white' : 'bg-[color:var(--sp-icon-tile)] text-[color:var(--sp-accent)]')}>
                      <Icon size={21} strokeWidth={2.1} />
                    </div>
                    <span className={cn('rounded-full px-3 py-1 text-xs font-bold', index === 4 ? 'bg-white/10 text-white/70' : 'bg-[color:var(--sp-chip)] text-[color:var(--sp-muted)]')}>
                      {item.status}
                    </span>
                  </div>

                  <BentoArtwork index={index} dark={index === 4} />

                  <div>
                    <h3 className={cn('mb-2 font-display text-2xl font-bold tracking-tight', index === 4 ? 'text-white' : 'text-[color:var(--sp-ink)]')}>
                      {item.title}
                      <span className={cn('ml-2 align-middle text-xs font-bold uppercase tracking-[0.16em]', index === 4 ? 'text-white/45' : 'text-[color:var(--sp-soft)]')}>
                        {item.meta}
                      </span>
                    </h3>
                    <p className={cn('max-w-xl text-sm leading-6', index === 4 ? 'text-white/62' : 'text-[color:var(--sp-muted)]')}>{item.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span key={tag} className={cn('rounded-full px-2.5 py-1 text-xs font-bold', index === 4 ? 'bg-white/10 text-white/55' : 'bg-[color:var(--sp-tag)] text-[color:var(--sp-soft)]')}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BentoArtwork({ index, dark }: { index: number; dark: boolean }) {
  if (index === 0) {
    return (
      <div className={cn('relative h-32 overflow-hidden rounded-2xl border', dark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/[0.035]')}>
        <div className="absolute left-5 top-5 h-12 w-36 rounded-xl bg-black" />
        <div className="absolute bottom-5 left-5 h-4 w-44 rounded-full bg-black/20" />
        <div className="absolute bottom-5 right-5 grid h-12 w-12 place-items-center rounded-full bg-white shadow-xl">
          <span className="h-5 w-5 rounded-full border-4 border-black" />
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="relative h-32 overflow-hidden rounded-2xl border border-black/10 bg-[#0b0b0b]">
        <div className="absolute left-1/2 top-5 h-40 w-24 -translate-x-1/2 rotate-[-8deg] rounded-[1.6rem] border-[6px] border-zinc-800 bg-black shadow-2xl" />
        <div className="absolute left-1/2 top-12 h-14 w-32 -translate-x-1/2 rounded-xl bg-white" />
        <div className="absolute bottom-5 left-1/2 h-7 w-28 -translate-x-1/2 rounded-full bg-white/10" />
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="relative h-32 overflow-hidden rounded-2xl border border-black/10 bg-black/[0.035]">
        {[36, 58, 42, 76, 64].map((height, item) => (
          <div
            key={`${height}-${item}`}
            className="absolute bottom-5 w-8 rounded-t-xl bg-black"
            style={{ height, left: 24 + item * 46 }}
          />
        ))}
        <div className="absolute left-5 top-5 h-4 w-28 rounded-full bg-black/15" />
      </div>
    );
  }

  if (index === 3) {
    return (
      <div className="relative h-32 overflow-hidden rounded-2xl border border-black/10 bg-black/[0.035]">
        <div className="absolute left-5 top-1/2 h-1 w-[calc(100%-2.5rem)] -translate-y-1/2 rounded-full bg-black/15" />
        <div className="absolute left-7 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black text-white">1</div>
        <div className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black text-white">2</div>
        <div className="absolute right-7 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black text-white">3</div>
      </div>
    );
  }

  return (
    <div className="relative h-32 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="absolute left-1/2 top-6 h-20 w-16 -translate-x-1/2 rounded-b-3xl rounded-t-xl border border-white/35" />
      <div className="absolute left-1/2 top-14 h-8 w-14 -translate-x-1/2 rounded-full border border-white/20" />
      <div className="absolute bottom-5 left-5 h-3 w-28 rounded-full bg-white/16" />
      <div className="absolute bottom-5 right-5 h-3 w-16 rounded-full bg-white/10" />
    </div>
  );
}
