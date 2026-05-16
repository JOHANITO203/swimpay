import { AlertCircle, CheckCircle2, ChevronRight, Clock, Download, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const androidApkUrl = import.meta.env.VITE_ANDROID_APK_URL ?? '/downloads/swimpay-merchant.apk';

const reviewWidgets = [
  { label: 'À confirmer', value: '12', icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { label: 'Confirmés', value: '142', icon: CheckCircle2, color: 'text-accent', bg: 'bg-accent/10' },
];

const history = [
  { from: 'Olga K.', amount: '+ 1 200,00 ₽', time: 'Il y a 2m', status: 'confirm' },
  { from: 'Ivan S.', amount: '+ 850,50 ₽', time: 'Il y a 15m', status: 'pending' },
  { from: 'Dimitri P.', amount: '+ 14 000,00 ₽', time: 'Il y a 1h', status: 'confirm' },
];

export default function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden px-4 pb-16 pt-32 sm:px-6 lg:pt-36">
      <div className="pointer-events-none absolute right-[-12rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-blue-500/20 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-[-14rem] left-[-12rem] h-[32rem] w-[32rem] rounded-full bg-cyan-400/12 blur-[120px]" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.02fr_0.98fr]">
        <motion.div
          initial={{ opacity: 0, x: -36 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
          className="relative z-10"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-accent">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_18px_rgba(0,242,255,0.7)]" />
            Solution 100% Gratuite & Accessible
          </div>

          <h1 className="mb-7 max-w-3xl font-display text-5xl font-bold leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl lg:text-8xl">
            Paiements reçus <br />
            <span className="bg-gradient-to-r from-accent via-blue-300 to-cyan-100 bg-clip-text text-transparent">
              avec SwimPay
            </span>
          </h1>

          <p className="mb-9 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
            Offrez à vos clients une expérience de paiement guidée. Gérez votre comptabilité et vos accès business via l'app Merchant.{' '}
            <span className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold text-white/90">100% Gratuit.</span>
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={androidApkUrl} className="group flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-base font-bold text-brand-900 transition-all hover:bg-accent">
              <Download size={20} className="transition-transform group-hover:-translate-y-0.5" />
              Télécharger l’app Merchant
            </a>
            <a href="#features" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/12 px-7 py-4 text-base font-bold text-white transition-all hover:bg-white/7">
              Voir comment ça marche
              <ChevronRight size={20} />
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex justify-center lg:justify-end"
        >
          <div className="relative h-[640px] w-[320px] rounded-[3.5rem] border border-white/12 bg-[#050505] p-3 shadow-[0_40px_140px_rgba(0,0,0,0.55)] ring-8 ring-slate-950/45 sm:w-[340px]">
            <div className="relative flex h-full flex-col overflow-hidden rounded-[2.8rem] border border-white/7 bg-[#020617] font-sans">
              <div className="flex h-10 items-center justify-between px-8 text-[10px] font-medium text-white/45">
                <span>12:45</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full border border-white/20" />
                  <div className="h-2.5 w-4 rounded-[2px] bg-white/20" />
                </div>
              </div>

              <div className="px-6 pb-5 pt-2">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Espace Merchant</p>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-white">Dashboard</h2>
                  <div className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5">
                    <Users size={15} className="text-slate-300" />
                  </div>
                </div>
              </div>

              <div className="mb-5 px-4">
                <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-blue-600 via-indigo-700 to-brand-900 p-6 shadow-2xl">
                  <div className="absolute right-[-3rem] top-[-3rem] h-36 w-36 rounded-full bg-accent/20 blur-3xl" />
                  <div className="absolute bottom-[-3rem] left-[-3rem] h-36 w-36 rounded-full bg-blue-300/10 blur-3xl" />
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-blue-100/65">Paiements reçus</p>
                  <h3 className="mb-6 font-display text-3xl font-bold tracking-tight text-white">85 920,50 ₽</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="h-6 w-6 rounded-full border-2 border-brand-800 bg-slate-700" />
                      ))}
                    </div>
                    <span className="text-right font-mono text-[10px] tracking-[0.22em] text-blue-100/45">CARTE • 5421</span>
                  </div>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-2.5 px-4">
                {reviewWidgets.map((widget) => (
                  <div key={widget.label} className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.04] p-3.5">
                    <div className={cn('grid h-9 w-9 place-items-center rounded-xl', widget.bg, widget.color)}>
                      <widget.icon size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-tight text-slate-500">{widget.label}</p>
                      <p className="text-base font-bold leading-tight text-white">{widget.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex-1 overflow-hidden px-6">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Historique des paiements</p>
                <div className="space-y-3">
                  {history.map((item) => (
                    <div key={`${item.from}-${item.time}`} className="flex items-center justify-between border-b border-white/6 py-2">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-[10px] font-bold text-white">{item.from.charAt(0)}</div>
                        <div>
                          <p className="text-[11px] font-medium text-white">{item.from}</p>
                          <p className="text-[10px] text-slate-500">{item.time}</p>
                        </div>
                      </div>
                      <p className={cn('text-[11px] font-bold', item.status === 'confirm' ? 'text-accent' : 'text-yellow-400')}>{item.amount}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex h-16 items-center justify-around border-t border-white/6 bg-white/[0.045] px-4 backdrop-blur-md">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-accent/20 text-accent"><CheckCircle2 size={16} /></div>
                <div className="grid h-8 w-8 place-items-center rounded-full text-slate-500"><Download size={16} /></div>
                <div className="grid h-8 w-8 place-items-center rounded-full text-slate-500"><AlertCircle size={16} /></div>
              </div>
            </div>
          </div>

          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="glass absolute -right-4 top-20 hidden rounded-2xl p-4 shadow-xl md:block"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-green-500/20 text-green-400">
                <Clock size={22} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Dernier succès</p>
                <p className="font-bold text-white">+ 2 500,00 ₽</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
