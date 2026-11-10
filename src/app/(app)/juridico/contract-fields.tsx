"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ContractFieldDef } from "@/lib/contract-render";

/** Os campos do modelo, já preenchidos com padrão e orçamento, para revisar antes de gerar. */
export function ContractFields({
  fields,
  values,
  onChange,
  fromQuote = [],
}: {
  fields: ContractFieldDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  fromQuote?: string[];
}) {
  if (fields.length === 0) {
    return <p className="text-sm text-slate-400">Este modelo só usa os dados do cliente e da Monteiro.</p>;
  }
  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const id = `campo_${f.key}`;
        const value = values[f.key] ?? "";
        return (
          <div key={f.key}>
            {f.type === "boolean" ? (
              <label htmlFor={id} className="flex min-h-11 items-start gap-3 text-sm text-slate-700">
                <input
                  id={id}
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0"
                  checked={value === "sim"}
                  onChange={(e) => onChange(f.key, e.target.checked ? "sim" : "")}
                />
                <span>
                  {f.label}
                  {f.hint && <span className="block text-xs text-slate-500">{f.hint}</span>}
                </span>
              </label>
            ) : (
              <>
                <Label htmlFor={id}>
                  {f.label}
                  {f.required ? " *" : ""}
                  {fromQuote.includes(f.key) && <span className="ml-2 text-xs font-normal text-emerald-700">do orçamento</span>}
                </Label>
                {f.type === "textarea" ? (
                  <Textarea id={id} rows={3} value={value} onChange={(e) => onChange(f.key, e.target.value)} />
                ) : (
                  <Input
                    id={id}
                    type={f.type === "date" ? "date" : "text"}
                    inputMode={f.type === "money" ? "decimal" : f.type === "number" ? "numeric" : undefined}
                    placeholder={f.type === "money" ? "Ex.: 300,00" : undefined}
                    value={value}
                    onChange={(e) => onChange(f.key, e.target.value)}
                  />
                )}
                {f.hint && <p className="mt-1 text-xs text-slate-500">{f.hint}</p>}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
