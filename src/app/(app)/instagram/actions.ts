"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { instagramMetricSchema } from "@/lib/validations";

export type InstagramMetricFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function extractMetricData(formData: FormData) {
  return {
    date: formData.get("date") || "",
    followers: formData.get("followers") || "",
    posts: formData.get("posts") || undefined,
    likes: formData.get("likes") || undefined,
    comments: formData.get("comments") || undefined,
    shares: formData.get("shares") || undefined,
    reach: formData.get("reach") || undefined,
    profileVisits: formData.get("profileVisits") || undefined,
    notes: formData.get("notes") || undefined,
  };
}

export async function createInstagramMetricAction(
  _prevState: InstagramMetricFormState,
  formData: FormData,
): Promise<InstagramMetricFormState> {
  const session = await requireRole(Role.ADMIN, Role.GESTOR, Role.BIA);
  const raw = extractMetricData(formData);
  const parsed = instagramMetricSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  await prisma.instagramMetric.create({
    data: {
      date: new Date(data.date),
      followers: Number(data.followers),
      posts: data.posts ? Number(data.posts) : 0,
      likes: data.likes ? Number(data.likes) : 0,
      comments: data.comments ? Number(data.comments) : 0,
      shares: data.shares ? Number(data.shares) : 0,
      reach: data.reach ? Number(data.reach) : 0,
      profileVisits: data.profileVisits ? Number(data.profileVisits) : 0,
      notes: data.notes || null,
      createdById: session.userId,
    },
  });

  revalidatePath("/instagram");
  revalidatePath("/dashboard");
  redirect("/instagram");
}

export async function updateInstagramMetricAction(
  metricId: string,
  _prevState: InstagramMetricFormState,
  formData: FormData,
): Promise<InstagramMetricFormState> {
  await requireRole(Role.ADMIN, Role.GESTOR, Role.BIA);
  const raw = extractMetricData(formData);
  const parsed = instagramMetricSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  await prisma.instagramMetric.update({
    where: { id: metricId },
    data: {
      date: new Date(data.date),
      followers: Number(data.followers),
      posts: data.posts ? Number(data.posts) : 0,
      likes: data.likes ? Number(data.likes) : 0,
      comments: data.comments ? Number(data.comments) : 0,
      shares: data.shares ? Number(data.shares) : 0,
      reach: data.reach ? Number(data.reach) : 0,
      profileVisits: data.profileVisits ? Number(data.profileVisits) : 0,
      notes: data.notes || null,
    },
  });

  revalidatePath("/instagram");
  revalidatePath("/dashboard");
  redirect("/instagram");
}

export async function deleteInstagramMetricAction(metricId: string) {
  await requireRole(Role.ADMIN, Role.GESTOR, Role.BIA);
  await prisma.instagramMetric.delete({ where: { id: metricId } }).catch(() => null);
  revalidatePath("/instagram");
  revalidatePath("/dashboard");
}
