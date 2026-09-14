import { z } from "zod";
import { CLIENT_TOKEN_KEYS } from "@/lib/document-tokens";

const normalizedEmail = z
  .string()
  .email("Informe um e-mail válido.")
  .transform((v) => v.trim().toLowerCase());

const optionalDateString = z
  .string()
  .optional()
  .refine(
    (v) => !v || !Number.isNaN(Date.parse(v)),
    "Data inválida.",
  );

const optionalDecimalString = z
  .string()
  .optional()
  .refine(
    (v) => !v || /^\d+(\.\d{1,2})?$/.test(v),
    "Informe um valor numérico válido (ex.: 150.00).",
  );

const optionalIntString = z
  .string()
  .optional()
  .refine((v) => !v || /^\d+$/.test(v), "Informe um número inteiro válido.");

const optionalCpfString = z
  .string()
  .optional()
  .transform((v) => (v ? v.replace(/\D/g, "") : v))
  .refine((v) => !v || v.length === 11, "CPF deve conter 11 dígitos.");

const optionalCnpjString = z
  .string()
  .optional()
  .transform((v) => (v ? v.replace(/\D/g, "") : v))
  .refine((v) => !v || v.length === 14, "CNPJ deve conter 14 dígitos.");

export const loginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1, "Informe a senha."),
});

export const clientSchema = z
  .object({
    type: z.enum(["PF", "PJ"]),
    status: z.enum(["ATIVO", "INATIVO"]).default("ATIVO"),

    fullName: z.string().optional(),
    cpf: optionalCpfString,
    rg: z.string().optional(),
    birthDate: optionalDateString,
    maritalStatus: z.string().optional(),
    profession: z.string().optional(),

    legalName: z.string().optional(),
    tradeName: z.string().optional(),
    cnpj: optionalCnpjString,
    stateRegistration: z.string().optional(),
    responsibleName: z.string().optional(),
    responsibleCpf: optionalCpfString,
    responsibleRole: z.string().optional(),

    addressStreet: z.string().optional(),
    addressNumber: z.string().optional(),
    addressComplement: z.string().optional(),
    addressNeighborhood: z.string().optional(),
    addressCity: z.string().optional(),
    addressState: z.string().optional(),
    addressZip: z.string().optional(),

    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
    instagram: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "PF" && !data.fullName?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["fullName"],
        message: "Nome completo é obrigatório para pessoa física.",
      });
    }
    if (data.type === "PJ" && !data.legalName?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["legalName"],
        message: "Razão social é obrigatória para pessoa jurídica.",
      });
    }
  });

export type ClientFormValues = z.infer<typeof clientSchema>;

export const leadSchema = z.object({
  name: z.string().min(1, "Informe o nome."),
  whatsapp: z.string().optional(),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  city: z.string().optional(),
  clientTypeGuess: z.enum(["PF", "PJ"]).optional().or(z.literal("")),
  serviceInterestId: z.string().optional(),
  origin: z.string().optional(),
  responsibleId: z.string().optional(),
  temperature: z.enum(["FRIO", "MORNO", "QUENTE"]).default("MORNO"),
  stage: z
    .enum([
      "NOVO_LEAD",
      "PRIMEIRO_CONTATO",
      "EM_ATENDIMENTO",
      "INTERESSADO",
      "ORCAMENTO_ENVIADO",
      "NEGOCIACAO",
      "CONTRATADO",
      "PERDIDO",
    ])
    .default("NOVO_LEAD"),
  nextContactDate: optionalDateString,
  notes: z.string().optional(),
});

export type LeadFormValues = z.infer<typeof leadSchema>;

export const serviceSchema = z.object({
  name: z.string().min(1, "Informe o nome do serviço."),
  category: z.string().optional(),
  description: z.string().optional(),
  defaultPrice: optionalDecimalString,
  defaultTermDays: optionalIntString,
  checklistTemplate: z.string().optional(),
  defaultResponsibleId: z.string().optional(),
  active: z.boolean().default(true),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;

export const userSchema = z.object({
  name: z.string().min(1, "Informe o nome."),
  email: normalizedEmail,
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres.").optional(),
  role: z.enum(["ADMIN", "GESTOR", "BIA"]),
  active: z.boolean().default(true),
});

export type UserFormValues = z.infer<typeof userSchema>;

const quoteItemSchema = z.object({
  serviceId: z.string().optional(),
  description: z.string().min(1, "Descreva o item."),
  quantity: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), "Quantidade inválida.")
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  unitPrice: z
    .string()
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Valor unitário inválido."),
  termDays: optionalIntString,
});

export const quoteSchema = z.object({
  clientId: z.string().min(1, "Selecione um cliente."),
  paymentTerms: z.string().optional(),
  validUntil: optionalDateString,
  notes: z.string().optional(),
  items: z
    .string()
    .min(1, "Adicione ao menos um item.")
    .transform((raw, ctx) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        ctx.addIssue({ code: "custom", message: "Itens inválidos." });
        return z.NEVER;
      }
      const result = z.array(quoteItemSchema).min(1, "Adicione ao menos um item.").safeParse(parsed);
      if (!result.success) {
        ctx.addIssue({ code: "custom", message: "Verifique os itens do orçamento." });
        return z.NEVER;
      }
      return result.data;
    }),
});

export type QuoteFormValues = z.infer<typeof quoteSchema>;

export const proposalSchema = z.object({
  clientId: z.string().min(1, "Selecione um cliente."),
  leadId: z.string().optional(),
  serviceId: z.string().optional(),
  demand: z.string().min(1, "Descreva a demanda do cliente."),
  solution: z.string().min(1, "Descreva a solução proposta."),
  scope: z.string().optional(),
  termText: z.string().optional(),
  investment: optionalDecimalString,
  paymentTerms: z.string().optional(),
  validUntil: optionalDateString,
  notes: z.string().optional(),
});

export type ProposalFormValues = z.infer<typeof proposalSchema>;

export const prospectSchema = z.object({
  name: z.string().min(1, "Informe o nome."),
  segment: z.string().optional(),
  city: z.string().optional(),
  contactName: z.string().optional(),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  potentialServiceId: z.string().optional(),
  responsibleId: z.string().optional(),
  contactDate: optionalDateString,
  result: z.string().optional(),
  nextContactDate: optionalDateString,
  notes: z.string().optional(),
});

export type ProspectFormValues = z.infer<typeof prospectSchema>;

const templateFieldDefSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Use letras maiúsculas, números e _ (ex.: VALOR_TOTAL)."),
  label: z.string().min(1, "Informe o rótulo do campo."),
  type: z.enum(["text", "textarea", "number", "date"]),
  required: z.boolean(),
});

export const documentTemplateSchema = z.object({
  name: z.string().min(1, "Informe o nome do modelo."),
  category: z.string().optional(),
  content: z.string().min(1, "Informe o conteúdo do modelo."),
  headerNote: z.string().optional(),
  footerNote: z.string().optional(),
  fieldsSchema: z
    .string()
    .transform((raw, ctx) => {
      let parsed: unknown;
      try {
        parsed = raw.trim() ? JSON.parse(raw) : [];
      } catch {
        ctx.addIssue({ code: "custom", message: "Campos dinâmicos inválidos." });
        return z.NEVER;
      }
      const result = z.array(templateFieldDefSchema).safeParse(parsed);
      if (!result.success) {
        ctx.addIssue({
          code: "custom",
          message: result.error.issues[0]?.message ?? "Verifique os campos dinâmicos.",
        });
        return z.NEVER;
      }
      const keys = result.data.map((f) => f.key);
      if (new Set(keys).size !== keys.length) {
        ctx.addIssue({ code: "custom", message: "Cada campo dinâmico precisa de uma chave única." });
        return z.NEVER;
      }
      const reserved = keys.find((k) => (CLIENT_TOKEN_KEYS as string[]).includes(k));
      if (reserved) {
        ctx.addIssue({
          code: "custom",
          message: `A chave ${reserved} já é usada automaticamente para os dados do cliente — escolha outra.`,
        });
        return z.NEVER;
      }
      return result.data;
    }),
});

export type DocumentTemplateFormValues = z.infer<typeof documentTemplateSchema>;

export const generateDocumentSchema = z.object({
  clientId: z.string().min(1, "Selecione um cliente."),
  templateId: z.string().min(1, "Selecione um modelo."),
  title: z.string().optional(),
  fieldValues: z
    .string()
    .transform((raw, ctx) => {
      try {
        const parsed = JSON.parse(raw || "{}");
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("invalid");
        }
        return parsed as Record<string, string>;
      } catch {
        ctx.addIssue({ code: "custom", message: "Valores de campos inválidos." });
        return z.NEVER;
      }
    }),
});

export type GenerateDocumentFormValues = z.infer<typeof generateDocumentSchema>;

export const taskSchema = z.object({
  title: z.string().min(1, "Informe o título da tarefa."),
  description: z.string().optional(),
  assignedToId: z.string().optional(),
  dueDate: optionalDateString,
  clientId: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof taskSchema>;

export const calendarEventSchema = z.object({
  title: z.string().min(1, "Informe o título do evento."),
  type: z.enum([
    "ATENDIMENTO",
    "REUNIAO",
    "PRAZO",
    "ENTREGA",
    "PROSPECCAO",
    "TAREFA",
    "PUBLICACAO",
    "GRAVACAO",
    "RETORNO_CLIENTE",
  ]),
  startAt: z.string().min(1, "Informe a data/hora de início.").refine(
    (v) => !Number.isNaN(Date.parse(v)),
    "Data/hora inválida.",
  ),
  endAt: optionalDateString,
  clientId: z.string().optional(),
  responsibleId: z.string().optional(),
  notes: z.string().optional(),
});

export type CalendarEventFormValues = z.infer<typeof calendarEventSchema>;

export const serviceInstanceEditSchema = z.object({
  title: z.string().min(1, "Informe o título do serviço."),
  responsibleId: z.string().optional(),
  dueDate: optionalDateString,
  notes: z.string().optional(),
});

export type ServiceInstanceEditFormValues = z.infer<typeof serviceInstanceEditSchema>;

export const financialAccountSchema = z.object({
  name: z.string().min(1, "Informe o nome da conta."),
  type: z.string().optional(),
  active: z.boolean().default(true),
});

export type FinancialAccountFormValues = z.infer<typeof financialAccountSchema>;

export const receivableSchema = z.object({
  clientId: z.string().optional(),
  description: z.string().min(1, "Informe a descrição."),
  amount: z
    .string()
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Informe um valor numérico válido."),
  dueDate: optionalDateString,
  accountId: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

export type ReceivableFormValues = z.infer<typeof receivableSchema>;

export const payableSchema = z.object({
  description: z.string().min(1, "Informe a descrição."),
  category: z.string().optional(),
  supplier: z.string().optional(),
  amount: z
    .string()
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Informe um valor numérico válido."),
  dueDate: optionalDateString,
  accountId: z.string().optional(),
  notes: z.string().optional(),
});

export type PayableFormValues = z.infer<typeof payableSchema>;

export const commissionSchema = z.object({
  userId: z.string().min(1, "Selecione o usuário."),
  clientId: z.string().optional(),
  category: z.enum(["SALARIO_FIXO", "COMISSAO", "OUTRO_PAGAMENTO"]),
  baseAmount: optionalDecimalString,
  percentage: optionalDecimalString,
  amount: z
    .string()
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Informe um valor numérico válido."),
  date: optionalDateString,
  notes: z.string().optional(),
});

export type CommissionFormValues = z.infer<typeof commissionSchema>;
