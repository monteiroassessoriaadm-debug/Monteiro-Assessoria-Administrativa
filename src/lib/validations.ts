import { z } from "zod";

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
