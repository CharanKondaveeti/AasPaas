"use client";
import { useState } from "react";
import { MapPin, Check, ImagePlus } from "lucide-react";
import Modal from "@/shared/components/Modal";
type Props = {
  point: [number, number] | null;
  onClose: () => void;
  onPick: () => void;
  draft: Record<string, string>;
  onDraft: (v: Record<string, string>) => void;
};
export default function SuggestionForm({
  point,
  onClose,
  onPick,
  draft,
  onDraft,
}: Props) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [photo, setPhoto] = useState<File | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!point) {
      setError("Choose the location on the map first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      form.set("longitude", String(point[0]));
      form.set("latitude", String(point[1]));
      if (photo) form.set("photo", photo);
      const response = await fetch("/api/suggestions", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDone(true);
      onDraft({});
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not send your suggestion.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={done ? "A new corner, shared." : "Know a place we should know?"}
      onClose={onClose}
    >
      {done ? (
        <div className="success">
          <Check size={32} />
          <p>
            Thank you! We’ll check your suggestion before adding it to the map.
          </p>
          <button className="primary" onClick={onClose}>
            Back to exploring
          </button>
        </div>
      ) : (
        <form className="suggestion-form" onSubmit={submit}>
          <p className="muted">
            Your favourite chai spot. A quiet park. Somewhere worth sharing.
          </p>
          <label>
            Place name
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              value={draft.name || ""}
              onChange={(e) => onDraft({ ...draft, name: e.target.value })}
              placeholder="What’s the place called?"
            />
          </label>
          <label>
            Location
            <button type="button" className="location-picker" onClick={onPick}>
              <MapPin size={19} />
              {point
                ? `${point[1].toFixed(5)}, ${point[0].toFixed(5)} · Change`
                : "Choose a spot on the map"}
            </button>
          </label>
          <label>
            What is it famous for?
            <textarea
              name="famous_for"
              required
              minLength={5}
              maxLength={400}
              value={draft.famous_for || ""}
              onChange={(e) =>
                onDraft({ ...draft, famous_for: e.target.value })
              }
              placeholder="Tell us what makes it special…"
              rows={3}
            />
          </label>
          <label className="photo-input">
            <ImagePlus size={19} /> Add a photo{" "}
            <span>optional · JPG, PNG, WebP · up to 3 MB</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            />
          </label>
          {photo && (
            <label className="consent">
              <input
                type="checkbox"
                name="photo_consent"
                value="yes"
                required
              />
              I own this photo or have permission to share it publicly.
            </label>
          )}
          <div className="honeypot" aria-hidden="true">
            <label>
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Sending…" : "Send suggestion"}
          </button>
          <p className="quiet">
            Every suggestion is reviewed. Nothing is published automatically.
          </p>
        </form>
      )}
    </Modal>
  );
}
