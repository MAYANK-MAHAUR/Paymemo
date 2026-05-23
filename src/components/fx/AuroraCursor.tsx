import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Aurora Cursor Companion
 * - A soft, blurred aurora blob trails the cursor with spring physics.
 * - Swells + shifts label when hovering elements with [data-cursor].
 * - Hidden on touch / coarse pointers and respects prefers-reduced-motion.
 */
export function AuroraCursor() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);

  // Two springs at different stiffness create the "trailing" feel.
  const blobX = useSpring(x, { stiffness: 180, damping: 22, mass: 0.6 });
  const blobY = useSpring(y, { stiffness: 180, damping: 22, mass: 0.6 });
  const dotX = useSpring(x, { stiffness: 600, damping: 36, mass: 0.3 });
  const dotY = useSpring(y, { stiffness: 600, damping: 36, mass: 0.3 });

  const [enabled, setEnabled] = useState(false);
  const [variant, setVariant] = useState<"default" | "link" | "cta" | "text">("default");
  const [label, setLabel] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    setEnabled(true);

    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const over = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-cursor], a, button"
      );
      if (!target) {
        setVariant("default");
        setLabel("");
        return;
      }
      const v = (target.dataset.cursor as typeof variant) ||
        (target.tagName === "BUTTON" || target.getAttribute("role") === "button" ? "cta" : "link");
      setVariant(v);
      setLabel(target.dataset.cursorLabel ?? "");
    };
    const leaveDoc = () => {
      x.set(-200);
      y.set(-200);
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("pointerleave", leaveDoc);
    document.documentElement.style.cursor = "none";
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerleave", leaveDoc);
      document.documentElement.style.cursor = "";
    };
  }, [x, y]);

  // Center offsets via transforms.
  const blobLeft = useTransform(blobX, (v: number) => `${v}px`);
  const blobTop = useTransform(blobY, (v: number) => `${v}px`);
  const dotLeft = useTransform(dotX, (v: number) => `${v}px`);
  const dotTop = useTransform(dotY, (v: number) => `${v}px`);

  if (!enabled) return null;

  const scale = variant === "cta" ? 1.6 : variant === "link" ? 1.25 : variant === "text" ? 0.6 : 1;

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2 mix-blend-multiply"
        style={{ left: blobLeft, top: blobTop }}
      >
        <motion.div
          animate={{ scale }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          className="relative h-24 w-24"
        >
          <div className="absolute inset-0 rounded-full bg-[var(--pink)] opacity-70 blur-2xl" />
          <div className="absolute inset-2 rounded-full bg-[var(--papaya)] opacity-50 blur-xl" />
        </motion.div>
      </motion.div>

      <motion.div
        aria-hidden
        className="pointer-events-none fixed z-[61] -translate-x-1/2 -translate-y-1/2"
        style={{ left: dotLeft, top: dotTop }}
      >
        <motion.div
          animate={{
            width: variant === "cta" ? 56 : variant === "link" ? 40 : variant === "text" ? 2 : 8,
            height: variant === "cta" ? 56 : variant === "link" ? 40 : variant === "text" ? 18 : 8,
            borderRadius: variant === "text" ? 1 : 999,
            backgroundColor: variant === "default" ? "var(--ink)" : "transparent",
            borderColor: "var(--ink)",
            borderWidth: variant === "default" ? 0 : 1.5,
          }}
          transition={{ type: "spring", stiffness: 350, damping: 26 }}
          className="grid place-items-center border-[var(--ink)]"
        >
          {label && variant !== "text" && (
            <motion.span
              key={label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-serif-italic text-[11px] leading-none text-[var(--ink)] select-none"
            >
              {label}
            </motion.span>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}
