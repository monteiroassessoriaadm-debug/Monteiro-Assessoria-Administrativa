"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { calendarEventSchema } from "@/lib/validations";

export type CalendarEventFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createCalendarEventAction(
  _prevState: CalendarEventFormState,
  formData: FormData,
): Promise<CalendarEventFormState> {
  const session = await requireSession();

  const parsed = calendarEventSchema.safeParse({
    title: formData.get("title") || "",
    type: formData.get("type") || "",
    startAt: formData.get("startAt") || "",
    endAt: formData.get("endAt") || undefined,
    clientId: formData.get("clientId") || undefined,
    responsibleId: formData.get("responsibleId") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  await prisma.calendarEvent.create({
    data: {
      title: data.title,
      type: data.type,
      startAt: new Date(data.startAt),
      endAt: data.endAt ? new Date(data.endAt) : null,
      clientId: data.clientId || null,
      responsibleId: data.responsibleId || null,
      notes: data.notes || null,
      createdById: session.userId,
    },
  });

  revalidatePath("/agenda");
  redirect("/agenda");
}

export async function deleteCalendarEventAction(eventId: string) {
  await requireSession();
  await prisma.calendarEvent.delete({ where: { id: eventId } }).catch(() => null);
  revalidatePath("/agenda");
}
