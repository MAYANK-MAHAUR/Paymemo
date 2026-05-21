import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function FinalCTA() {
  return (
    <section className="relative px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2.5rem] bg-aurora-animated p-10 sm:p-16 text-ink shadow-card"
        >
          <div className="absolute inset-0 grain opacity-25" />
          <div className="relative max-w-3xl">
            <h2 className="text-4xl sm:text-6xl font-semibold tracking-[-0.025em] leading-[1.02]">
              Turn wallet activity into <span className="font-serif-italic">financial memory.</span>
            </h2>
            <p className="mt-6 text-ink/80 max-w-xl text-lg">
              Wallets show what happened. PayMemo records why after a transaction is detected.
              Start with a Morph Hoodi test payment or watched-wallet demo.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/app" className="group inline-flex items-center gap-2 rounded-full bg-ink text-cream px-6 py-3.5 text-sm font-semibold hover:bg-ink/85 transition-all">
                Launch App <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link to="/app/send" className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur border border-ink/35 px-6 py-3.5 text-sm font-semibold hover:bg-white transition">
                Start with a test payment
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
