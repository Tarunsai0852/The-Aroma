import React, { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Layers,
  FileText,
  Pencil,
  Trash2,
  PlusCircle,
} from "lucide-react";
import Navbar from "../../components/common/Navbar";

const CMS_STORAGE_KEY = "aroma-content-blocks";

const now = new Date();
const defaultBlocks = [
  {
    id: "hero-spotlight",
    title: "Hero Spotlight",
    slug: "hero-spotlight",
    status: "published",
    body: "Welcome visitors with rotating seasonal hero copy, a quick call to action, and a reminder that great food starts with curiosity.",
    updatedAt: now.toISOString(),
  },
  {
    id: "recipe-builder-preview",
    title: "Recipe Builder Preview",
    slug: "recipe-builder-preview",
    status: "draft",
    body: "Highlight the builder experience with tips, quick filters, and a testimonial pulled from the most recent meal plan.",
    updatedAt: new Date(now.getTime() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: "community-announcement",
    title: "Community Announcement",
    slug: "community-announcement",
    status: "published",
    body: "Share the latest cooking challenge or live kitchen session so returning chefs can jump back into the conversation.",
    updatedAt: new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
  },
];

const generateSlug = (value) => {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return sanitized;
};

const makeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 8);
};

const initialFormState = {
  id: null,
  title: "",
  slug: "",
  status: "published",
  body: "",
};

const formatTimestamp = (value) => {
  if (!value) return "Never";
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch (error) {
    return "Unknown";
  }
};

const loadBlocksFromStorage = () => {
  if (typeof window === "undefined") {
    return defaultBlocks;
  }

  try {
    const stored = window.localStorage.getItem(CMS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultBlocks;
  } catch (error) {
    console.error("Unable to load CMS blocks from storage", error);
    return defaultBlocks;
  }
};

const ContentStudio = () => {
  const [blocks, setBlocks] = useState(loadBlocksFromStorage);
  const [formState, setFormState] = useState(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState({ text: "", tone: "info" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(blocks));
  }, [blocks]);

  const stats = useMemo(() => {
    const published = blocks.filter((block) => block.status === "published").length;
    const drafts = blocks.filter((block) => block.status !== "published").length;
    return {
      total: blocks.length,
      published,
      drafts,
      latestBlock: blocks[0],
    };
  }, [blocks]);

  const slugPreview =
    generateSlug(formState.slug || formState.title) || "your-slug-goes-here";

  const setFeedbackMessage = (text, tone = "info") => {
    setFeedback({ text, tone });
  };

  const handleInputChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const resetForm = () => {
    setFormState(initialFormState);
    setIsEditing(false);
  };

  const startEditing = (block) => {
    setFormState(block);
    setIsEditing(true);
    setFeedbackMessage(`Editing "${block.title}".`, "info");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedTitle = formState.title.trim();

    if (!trimmedTitle) {
      setFeedbackMessage("Title is required to save a block.", "error");
      return;
    }

    const slugSource = formState.slug.trim() || trimmedTitle;
    const slug = generateSlug(slugSource);

    if (!slug) {
      setFeedbackMessage("Slug must include letters or numbers.", "error");
      return;
    }

    if (blocks.some((block) => block.slug === slug && block.id !== formState.id)) {
      setFeedbackMessage("That slug is already in use. Try a different label.", "error");
      return;
    }

    const payload = {
      ...formState,
      id: formState.id || makeId(),
      title: trimmedTitle,
      slug,
      body: formState.body.trim(),
      updatedAt: new Date().toISOString(),
    };

    setBlocks((prev) => {
      if (formState.id) {
        return [payload, ...prev.filter((block) => block.id !== formState.id)];
      }
      return [payload, ...prev];
    });

    setFeedbackMessage(
      formState.id ? `Updated "${trimmedTitle}".` : `Saved "${trimmedTitle}".`,
      "success"
    );
    resetForm();
  };

  const handleDelete = (blockToDelete) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Remove "${blockToDelete.title}" from the CMS?`)
    ) {
      return;
    }

    setBlocks((prev) =>
      prev.filter((block) => block.id !== blockToDelete.id)
    );

    if (formState.id === blockToDelete.id) {
      resetForm();
    }

    setFeedbackMessage(`Removed "${blockToDelete.title}".`, "success");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-10 space-y-10">
        <section className="rounded-3xl bg-white p-8 shadow-lg">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <Sparkles size={18} className="text-primary-500" />
                Content Studio
              </p>
              <h1 className="text-3xl font-semibold text-gray-900">Manage evergreen copy</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-500">
                Keep hero sections, announcements, and themed panels fresh without touching the codebase.
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 rounded-2xl border border-primary-100 bg-primary-50 p-4 text-center text-xs text-primary-700 sm:w-auto sm:grid-cols-3">
              <div>
                <p className="text-xs text-primary-500">Live sections</p>
                <p className="text-lg font-semibold">{stats.published}</p>
              </div>
              <div>
                <p className="text-xs text-primary-500">Drafts</p>
                <p className="text-lg font-semibold">{stats.drafts}</p>
              </div>
              <div>
                <p className="text-xs text-primary-500">Last updated</p>
                <p className="text-lg font-semibold">
                  {stats.latestBlock ? formatTimestamp(stats.latestBlock.updatedAt) : "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <form
              onSubmit={handleSubmit}
              className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Section builder</h2>
                  <p className="text-sm text-gray-500">Define a title, slug, and body for each block.</p>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    className="text-sm text-primary-600 hover:underline"
                    onClick={resetForm}
                  >
                    Cancel edit
                  </button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Title
                  <input
                    type="text"
                    value={formState.title}
                    onChange={handleInputChange("title")}
                    className="input-field"
                    placeholder="Heading you want to highlight"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Slug
                  <input
                    type="text"
                    value={formState.slug}
                    onChange={handleInputChange("slug")}
                    className="input-field"
                    placeholder="hero-spotlight"
                  />
                  <p className="text-xs text-gray-500">
                    Preview: <span className="font-medium text-gray-800">{`/${slugPreview}`}</span>
                  </p>
                </label>
              </div>

              <label className="space-y-2 text-sm font-medium text-gray-700">
                Status
                <select
                  value={formState.status}
                  onChange={handleInputChange("status")}
                  className="input-field"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </label>

              <label className="space-y-2 text-sm font-medium text-gray-700">
                Body
                <textarea
                  value={formState.body}
                  onChange={handleInputChange("body")}
                  className="input-field h-40 resize-y"
                  placeholder="Add the copy that should appear across hero, planner, and AI recipe pages."
                />
              </label>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    className="btn-primary inline-flex items-center justify-center gap-2"
                  >
                    <PlusCircle size={18} />
                    {isEditing ? "Update section" : "Save section"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary inline-flex items-center justify-center gap-2"
                    onClick={resetForm}
                  >
                    Reset form
                  </button>
                </div>
                {feedback.text && (
                  <p
                    className={`text-sm ${
                      feedback.tone === "error"
                        ? "text-red-500"
                        : feedback.tone === "success"
                        ? "text-green-600"
                        : "text-gray-600"
                    }`}
                  >
                    {feedback.text}
                  </p>
                )}
              </div>
            </form>

            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                      <Layers size={14} className="inline-block" /> Current blocks
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900">Content inventory</h3>
                  </div>
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                    {stats.total}
                  </span>
                </div>

                {blocks.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-500">
                    You haven’t added any sections yet. Start with a title and slug to begin.
                  </p>
                ) : (
                  <div className="mt-6 space-y-4">
                    {blocks.map((block) => (
                      <article
                        key={block.id}
                        className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <p className="flex items-center gap-1 text-xs uppercase tracking-widest text-gray-400">
                              <FileText size={14} /> {block.status}
                            </p>
                            <h4 className="text-lg font-medium text-gray-900">{block.title}</h4>
                            <p className="text-xs text-gray-500">{`/${block.slug}`}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:border-primary-200 hover:text-primary-600"
                              onClick={() => startEditing(block)}
                            >
                              <Pencil size={14} className="inline" /> Edit
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-red-100 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                              onClick={() => handleDelete(block)}
                            >
                              <Trash2 size={14} className="inline" /> Delete
                            </button>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-gray-600">
                          {block.body || "No copy yet for this section."}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                          <span>Updated {formatTimestamp(block.updatedAt)}</span>
                          <span className="font-medium">
                            {block.status === "published" ? "Live" : block.status}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ContentStudio;
