"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Monteiro CRM
        </p>
        <h1 className="mt-2 text-lg font-bold text-slate-900">
          Algo deu errado
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Ocorreu um erro inesperado. Você pode tentar novamente ou voltar
          para o dashboard.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Tentar novamente
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Ir para o dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
