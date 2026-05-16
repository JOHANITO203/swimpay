import { ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function TrustSection() {
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

          <h2 className="mb-5 font-display text-3xl font-bold tracking-tight text-white md:text-4xl">Une confirmation reste entre vos mains</h2>

          <p className="mx-auto max-w-2xl text-lg leading-8 text-slate-400 md:text-xl">
            SwimPay prépare la revue. <br className="hidden md:block" /> Le marchand garde la décision finale sur chaque transaction.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            <span>Sécurisé</span>
            <span className="text-accent/30">•</span>
            <span>Propriétaire</span>
            <span className="text-accent/30">•</span>
            <span>Android Only</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
