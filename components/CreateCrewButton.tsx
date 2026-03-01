"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { createCrew } from "@/actions/crew";
import { toast } from "@/lib/toast";

export function CreateCrewButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setLoading(true);
    try {
      const result = await createCrew(formData);
      if (result.error) {
        toast(result.error, "error");
        return;
      }
      setOpen(false);
      form.reset();
      router.refresh();
      if (result.data) {
        toast("Crew created. Share the invite code to add members.", "success");
        router.push(`/crew/${result.data.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 transition-colors"
      >
        Create Crew
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create a crew">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-zinc-400">Name</span>
            <input
              name="name"
              type="text"
              required
              className="mt-1 block w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="My Crew"
            />
          </label>
          <label className="block">
            <span className="text-sm text-zinc-400">Description (optional)</span>
            <textarea
              name="description"
              rows={2}
              className="mt-1 block w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              placeholder="What's this crew about?"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-500 py-3 font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </form>
      </Modal>
    </>
  );
}
