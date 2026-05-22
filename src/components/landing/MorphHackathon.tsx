import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Bot, BriefcaseBusiness, Building2, RadioTower, Repeat2 } from "lucide-react";
import { hackathonTracks, morphHoodi } from "@/lib/morph";

const icons = [BriefcaseBusiness, Building2, Repeat2, Bot];

export function MorphHackathon() {
  return (
    <section id="morph" className="relative px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-ink/35 bg-white p-8 shadow-card sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-pink">
              <RadioTower className="h-4 w-4" /> Morph Build In! Payments
            </span>
            <h2 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-[-0.02em]">
              Built for Morph Hoodi testnet payment demos.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink/80">
              PayMemo fits the hackathon's money-movement tracks by turning direct payments,
              wallet-assisted dApp transactions, bridges, payroll, and agent micropayments into
              private, exportable financial memory.
            </p>
          </div>
          <Link
            to="/app/morph"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream"
          >
            Open build center <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-4">
          {hackathonTracks.map((track, index) => {
            const Icon = icons[index] ?? RadioTower;
            return (
              <motion.div
                key={track.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: index * 0.07 }}
                className="rounded-2xl border border-ink/30 bg-cream/60 p-4"
              >
                <Icon className="h-5 w-5 text-pink" />
                <div className="mt-4 text-sm font-semibold">{track.title}</div>
                <p className="mt-2 text-xs leading-5 text-ink/78">{track.fit}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Pill label="Network" value={morphHoodi.name} />
          <Pill label="Chain ID" value={String(morphHoodi.chainId)} />
          <Pill label="Explorer" value="explorer-hoodi.morph.network" />
        </div>
      </div>
    </section>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink/25 bg-cream/60 px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-ink/68">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
