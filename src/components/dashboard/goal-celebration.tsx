"use client";

import { useEffect, useRef, useState } from "react";
import { PartyPopper, Trophy, X } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/utils";

// Comemoração de meta batida: faixa no painel + tela cheia no formato de story
// (9:16), com confete, para tirar print e postar. Abre sozinha uma vez por
// período; depois fica a faixa com o botão para abrir de novo.

const GOLD = "#bd9548"; // dourado oficial da Monteiro
const CONFETTI_COLORS = [GOLD, "#e6c77d", "#f5e6b8", "#ffffff", "#8a6a2c"];

export type CelebrationInfo = {
  key: string; // identifica o período, ex.: "MENSAL-2026-11-01"
  kind: "mes" | "semana";
  periodLabel: string; // "novembro de 2026" ou "09/11 a 15/11"
  percentual: number;
  recebido: number;
  meta: number;
};

type Piece = { x: number; y: number; w: number; h: number; vx: number; vy: number; rot: number; vr: number; color: string };

const frames = new WeakMap<HTMLCanvasElement, number>();

/** Solta o confete no canvas (fora do React: só desenha). */
function launchConfetti(el: HTMLCanvasElement | null) {
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = el.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const { width, height } = el.getBoundingClientRect();
  el.width = width * dpr;
  el.height = height * dpr;
  ctx.scale(dpr, dpr);
  const pieces: Piece[] = Array.from({ length: 220 }, () => ({
    x: width / 2 + (Math.random() - 0.5) * width * 0.3,
    y: height * 0.35,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 10,
    vx: (Math.random() - 0.5) * 14,
    vy: -6 - Math.random() * 12,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
  }));
  const started = performance.now();
  const previous = frames.get(el);
  if (previous) cancelAnimationFrame(previous);
  const tick = (now: number) => {
    ctx.clearRect(0, 0, width, height);
    for (const p of pieces) {
      p.vy += 0.25;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)));
      ctx.restore();
    }
    if (now - started < 6000) frames.set(el, requestAnimationFrame(tick));
    else ctx.clearRect(0, 0, width, height);
  };
  frames.set(el, requestAnimationFrame(tick));
}

function readSeen(key: string) {
  try {
    return window.localStorage.getItem(`monteiro-meta-comemorada:${key}`) === "1";
  } catch {
    return true; // sem armazenamento: não abre sozinha a cada visita
  }
}

function markSeen(key: string) {
  try {
    window.localStorage.setItem(`monteiro-meta-comemorada:${key}`, "1");
  } catch {}
}

export function GoalCelebration({
  info,
  company,
}: {
  info: CelebrationInfo;
  company: { name: string; slogan: string | null; logoData: string | null };
}) {
  const [open, setOpen] = useState(false);
  const [showValues, setShowValues] = useState(false);
  const [photoMode, setPhotoMode] = useState(false);
  const [hint, setHint] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fire = () => launchConfetti(canvas.current);
  const title = info.kind === "mes" ? "Meta do mês batida!" : "Meta da semana batida!";
  const pct = `${info.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;

  // Abre sozinha na primeira vez que a meta deste período aparece batida.
  useEffect(() => {
    if (readSeen(info.key)) return;
    markSeen(info.key);
    const t = window.setTimeout(() => setOpen(true), 400);
    return () => window.clearTimeout(t);
  }, [info.key]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => launchConfetti(canvas.current), 150);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPhotoMode(false);
          setOpen(true);
        }}
        className="flex w-full items-center gap-3 rounded-xl border p-4 text-left shadow-sm transition-transform active:scale-[0.99]"
        style={{ borderColor: GOLD, background: "linear-gradient(135deg, #0b0b0c 0%, #1c1710 100%)" }}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: GOLD }}>
          <Trophy className="h-6 w-6 text-black" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold text-white">🎉 {title}</span>
          <span className="block text-sm" style={{ color: "#e6c77d" }}>
            {pct} da meta {info.kind === "mes" ? `de ${info.periodLabel}` : `(${info.periodLabel})`}. Toque para comemorar e fazer o story.
          </span>
        </span>
        <PartyPopper className="hidden h-6 w-6 shrink-0 sm:block" style={{ color: GOLD }} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black"
          onClick={() => photoMode && setPhotoMode(false)}
        >
          {/* Quadro 9:16: no celular ocupa a tela; no computador fica no centro, pronto para print. */}
          <div
            className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-8 text-center sm:h-[min(92vh,860px)] sm:w-auto sm:aspect-[9/16] sm:rounded-3xl"
            style={{ background: `radial-gradient(circle at 50% 30%, #3a2c12 0%, #0b0b0c 60%)` }}
          >
            <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />

            <div className="relative flex flex-col items-center gap-5">
              {company.logoData ? (
                // eslint-disable-next-line @next/next/no-img-element -- logo enviada pelo admin (data URI)
                <img src={company.logoData} alt={company.name} className="h-20 max-w-[75%] object-contain" />
              ) : (
                <p className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: GOLD }}>
                  {company.name}
                </p>
              )}

              <span
                className="mt-2 flex h-24 w-24 items-center justify-center rounded-full"
                style={{ background: `radial-gradient(circle, #e6c77d 0%, ${GOLD} 70%)`, boxShadow: `0 0 60px ${GOLD}80` }}
              >
                <Trophy className="h-12 w-12 text-black" />
              </span>

              <div>
                <p className="text-5xl font-black leading-none tracking-tight text-white sm:text-6xl">META</p>
                <p className="text-5xl font-black leading-none tracking-tight sm:text-6xl" style={{ color: GOLD }}>
                  BATIDA!
                </p>
              </div>

              <p className="text-lg text-slate-200">
                {info.kind === "mes" ? (
                  <>
                    Fechamos a meta de <strong className="text-white">{info.periodLabel}</strong>
                  </>
                ) : (
                  <>
                    Meta da semana <strong className="text-white">{info.periodLabel}</strong> concluída
                  </>
                )}
              </p>

              <div className="rounded-2xl border px-6 py-3" style={{ borderColor: `${GOLD}66`, background: "#ffffff0d" }}>
                <p className="text-4xl font-extrabold" style={{ color: GOLD }}>
                  {pct}
                </p>
                <p className="text-xs uppercase tracking-widest text-slate-400">da meta</p>
                {showValues && (
                  <p className="mt-1 text-sm text-slate-200">
                    {formatCurrencyBRL(info.recebido)} de {formatCurrencyBRL(info.meta)}
                  </p>
                )}
              </div>

              <p className="max-w-xs text-base leading-relaxed text-slate-100">
                Obrigado a cada cliente que confia no nosso trabalho. Essa conquista é de vocês também! 💛
              </p>

              {company.slogan && (
                <p className="text-sm font-semibold uppercase tracking-[0.25em]" style={{ color: GOLD }}>
                  {company.slogan}
                </p>
              )}
            </div>

            {!photoMode && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar comemoração"
                className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                style={{ marginTop: "env(safe-area-inset-top)" }}
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {!photoMode && (
              <div
                className="absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-2 p-4"
                style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
                onClick={(e) => e.stopPropagation()}
              >
                <button type="button" onClick={fire} className="min-h-11 rounded-full px-4 text-sm font-semibold text-black" style={{ background: GOLD }}>
                  🎉 Mais confete
                </button>
                <button type="button" onClick={() => setShowValues((v) => !v)} className="min-h-11 rounded-full bg-white/10 px-4 text-sm font-medium text-white">
                  {showValues ? "Esconder valores" : "Mostrar valores"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoMode(true);
                    setHint(true);
                    window.setTimeout(() => setHint(false), 2500); // o aviso some antes do print
                    fire();
                  }}
                  className="min-h-11 rounded-full bg-white/10 px-4 text-sm font-medium text-white"
                >
                  📸 Modo story
                </button>
              </div>
            )}
          </div>
          {photoMode && hint && (
            <p className="pointer-events-none fixed inset-x-0 top-2 text-center text-xs text-white/60">
              Tire o print. Toque na tela para voltar aos botões.
            </p>
          )}
        </div>
      )}
    </>
  );
}
