import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { QA } from "@/lib/data";
import { faqsToText } from "@/lib/admin-format";
import { deletePost, savePost } from "@/app/admin/actions/content";
import { Area, Field, Notice, PageHeader, Panel, Select } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { MarkdownField } from "@/components/admin/MarkdownField";
import { SeoAssistant } from "@/components/admin/SeoAssistant";

const CATEGORIES = ["Guides", "Cost Guides", "Tips", "Hospitality", "Property Staging", "News"];

export default async function PostEdit({ params, searchParams }: PageProps<"/admin/posts/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const p = id === "new" ? null : await db.post.findUnique({ where: { id: Number(id) } });
  if (id !== "new" && !p) notFound();
  const services = await db.service.findMany({ where: { active: true }, select: { slug: true }, orderBy: { sortOrder: "asc" } });
  const pub = p?.publishedAt ? p.publishedAt.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" }) : "";

  return (
    <>
      <Link href="/admin/posts" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Blog posts
      </Link>
      <PageHeader
        title={p ? p.title : "New post"}
        actions={
          p?.status === "PUBLISHED" && (
            <a href={`/blog/${p.slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink hover:bg-sand">
              <ExternalLink className="size-4" /> View post
            </a>
          )
        }
      />
      {sp.saved && <Notice>Saved.</Notice>}
      <form id="post-form" action={savePost} className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <input type="hidden" name="id" value={p?.id ?? ""} />
        <div className="space-y-4">
          <Panel>
            <div className="grid gap-3">
              <Field label="Title (H1)" name="title" required defaultValue={p?.title} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="URL slug" name="slug" defaultValue={p?.slug} />
                <Select label="Category" name="category" defaultValue={p?.category ?? "Guides"} options={CATEGORIES} />
              </div>
              <Area label="Excerpt (≤ 35 words, shown on cards)" name="excerpt" rows={2} defaultValue={p?.excerpt ?? ""} />
              <MarkdownField
                name="body"
                label="Article"
                defaultValue={p?.body ?? "**Quick answer:** \n\n## "}
                rows={28}
                hint="Start with a 2–3 sentence 'Quick answer' (helps Google AI Overviews). Use ## headings, link to 2+ service pages and /quote."
              />
              <Area label="FAQs" name="faqs" mono rows={8} defaultValue={faqsToText((p?.faqs as QA[]) ?? [])} hint="Q: … / A: … blocks separated by a blank line" />
            </div>
          </Panel>
        </div>
        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Panel>
            <div className="space-y-3">
              <Select
                label="Status"
                name="status"
                defaultValue={p?.status ?? "DRAFT"}
                options={[
                  ["DRAFT", "Draft"],
                  ["PUBLISHED", "Published"],
                ]}
              />
              <Field label="Publish date" name="publishedAt" type="date" defaultValue={pub} />
              <Field label="Author" name="authorName" defaultValue={p?.authorName ?? "Brilliance Cleaning Team"} />
              <SubmitButton className="w-full">Save post</SubmitButton>
            </div>
          </Panel>
          <Panel title="Search appearance">
            <div className="space-y-3">
              <Field label="Meta title" name="metaTitle" defaultValue={p?.metaTitle ?? ""} maxLength={70} />
              <Area label="Meta description" name="metaDescription" rows={3} defaultValue={p?.metaDescription ?? ""} maxLength={200} />
            </div>
          </Panel>
          <SeoAssistant formId="post-form" path={`/blog/${p?.slug ?? "new"}`} h1Field="title" fallbackTitleField="title" defaultKeyword={p?.tags[0] ?? ""} minWords={1000} />
          <Panel title="Linking">
            <div className="space-y-3">
              <Area label="Related services (slugs)" name="relatedServices" mono rows={3} defaultValue={p?.relatedServices.join("\n") ?? ""} hint={services.map((s) => s.slug).join(", ")} />
              <Area label="Tags (one per line)" name="tags" mono rows={3} defaultValue={p?.tags.join("\n") ?? ""} />
            </div>
          </Panel>
        </div>
      </form>
      {p && user.role === "ADMIN" && (
        <form action={deletePost} className="mt-6">
          <input type="hidden" name="id" value={p.id} />
          <SubmitButton variant="danger" confirm="Delete this post?">
            Delete post
          </SubmitButton>
        </form>
      )}
    </>
  );
}
