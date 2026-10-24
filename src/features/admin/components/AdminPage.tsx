"use client";
import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowLeft, LogOut, ShieldCheck } from "lucide-react";
import { browserDb } from "@/lib/supabase";
import { adminRequest } from "@/services/placeService";
import { categories, dishes, discoveryGroups, placeDiscoveryGroup, type Place } from "@/lib/types";
import Modal from "@/shared/components/Modal";
export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null),
    [places, setPlaces] = useState<Place[]>([]),
    [progress, setProgress] = useState<Record<string, { approved: number; verified: number }>>({}),
    [status, setStatus] = useState("pending"),
    [offset, setOffset] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<Place | null>(null),
    [revision, setRevision] = useState(0),
    [photoUrl, setPhotoUrl] = useState("");
  useEffect(() => {
    try {
      const { data } = browserDb().auth.onAuthStateChange((_event, next) =>
        setSession(next),
      );
      return () => data.subscription.unsubscribe();
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (!session) {
      setPlaces([]);
      return;
    }
    let current = true;
    setBusy(true);
    adminRequest(
      `/api/admin/places?status=${status}&offset=${offset}`,
      session.access_token,
    )
      .then((d) => {
        if (current) {
          setPlaces(d.places);
          setProgress(d.progress || {});
          setError("");
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, [session, status, offset, revision]);
  useEffect(() => {
    setPhotoUrl("");
    if (!editing?.photo_path || !session) return;
    const abort = new AbortController();
    let url = "";
    fetch(`/api/photos?id=${editing.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: abort.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error("Photo unavailable");
        return r.blob();
      })
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setPhotoUrl(url);
      })
      .catch(() => {});
    return () => {
      abort.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [editing?.id, session]);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const { error } = await browserDb().auth.signInWithPassword({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      if (error) throw error;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing || !session) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData(e.currentTarget);
      const values = {
        name: String(form.get("name")),
        famous_for: String(form.get("famous_for")),
        latitude: Number(form.get("latitude")),
        longitude: Number(form.get("longitude")),
        category: String(form.get("category")),
        dish: form.get("dish") || null,
        description: String(form.get("description")),
        area: String(form.get("area")),
        hours: form.get("hours") || null,
        price: form.get("price") || null,
        source_url: form.get("source_url") || null,
        photo_credit: form.get("photo_credit") || null,
        status: String(form.get("status")),
        discovery_group: String(form.get("discovery_group")),
        listing_verified: form.get("listing_verified") === "on",
        verification_notes: form.get("verification_notes") || null,
        is_hidden_gem: form.get("is_hidden_gem") === "on",
        hidden_gem_reason: form.get("hidden_gem_reason") || null,
      };
      const payload = new FormData();
      payload.set("id", editing.id);
      payload.set("values", JSON.stringify(values));
      const photo = form.get("photo");
      if (photo instanceof File) payload.set("photo", photo);
      await adminRequest("/api/admin/places", session.access_token, {
        method: "PATCH",
        body: payload,
      });
      setEditing(null);
      setRevision((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-page">
      <header className="admin-header">
        <a href="/" className="back-link">
          <ArrowLeft size={18} />
          Back to the map
        </a>
        {session && (
          <button
            onClick={async () => {
              await browserDb().auth.signOut();
              setSession(null);
              setPlaces([]);
            }}
          >
            <LogOut size={17} />
            Sign out
          </button>
        )}
      </header>
      {!session ? (
        <section className="login-card">
          <ShieldCheck size={32} />
          <span className="eyebrow">AASPAAS CURATORS</span>
          <h1>A city worth caring for.</h1>
          <p>Sign in to review suggestions and keep the city guide useful.</p>
          <form onSubmit={login}>
            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </section>
      ) : (
        <section className="admin-content">
          <span className="eyebrow">CITY CURATION</span>
          <h1>Good places. Thoughtfully chosen.</h1>
          <p>
            Verify the name, location and photo rights before publishing. Move
            outdated places to Rejected to remove them from the public map.
          </p>
          <section className="curation-progress" aria-label="Hyderabad launch verification progress">
            {discoveryGroups.slice(1).map(({ value, label }) => {
              const target = value === "food" ? 210 : value === "experiences" ? 60 : 30;
              const count = progress[value] || { approved: 0, verified: 0 };
              return (
                <div className="curation-progress-group" key={value}>
                  <strong>{label}</strong>
                  <span>{count.verified} / {target} verified</span>
                  <progress value={Math.min(count.verified, target)} max={target} />
                  <small>{count.approved} approved records (not necessarily verified)</small>
                </div>
              );
            })}
          </section>
          <nav className="admin-tabs">
            {["pending", "approved", "rejected"].map((s) => (
              <button
                key={s}
                className={status === s ? "active" : ""}
                onClick={() => {
                  setStatus(s);
                  setOffset(0);
                }}
              >
                {s}
              </button>
            ))}
          </nav>
          {error && !editing && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {busy ? (
            <p>Loading…</p>
          ) : places.length === 0 ? (
            <div className="empty-state">No {status} places on this page.</div>
          ) : (
            <div className="admin-grid">
              {places.map((p) => (
                <article key={p.id}>
                  <span className="eyebrow">{placeDiscoveryGroup(p).replace("_", " ")} · {p.listing_verified_at ? "Verified" : "Needs verification"}</span>
                  <h2>{p.name}</h2>
                  <p>{p.famous_for}</p>
                  <p className="quiet">
                    {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                  </p>
                  <button
                    className="primary"
                    onClick={() => {
                      setError("");
                      setEditing(p);
                    }}
                  >
                    Review details
                  </button>
                </article>
              ))}
            </div>
          )}
          <div className="pagination">
            <button
              disabled={offset === 0}
              onClick={() => setOffset((v) => Math.max(0, v - 50))}
            >
              Previous
            </button>
            <span>Page {offset / 50 + 1}</span>
            <button
              disabled={places.length < 50}
              onClick={() => setOffset((v) => v + 50)}
            >
              Next
            </button>
          </div>
        </section>
      )}
      {editing && (
        <Modal
          title={`Review ${editing.name}`}
          onClose={() => setEditing(null)}
        >
          <form className="admin-edit" onSubmit={save}>
            {photoUrl && (
              <img
                className="review-photo"
                src={photoUrl}
                alt="Submitted place"
              />
            )}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={`https://www.google.com/maps/search/?api=1&query=${editing.latitude},${editing.longitude}`}
            >
              Check this location ↗
            </a>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={`/?q=${encodeURIComponent(editing.name)}`}
            >
              Check existing places ↗
            </a>
            {(
              [
                "name",
                "famous_for",
                "area",
                "description",
                "latitude",
                "longitude",
                "hours",
                "price",
                "source_url",
                "photo_credit",
              ] as const
            ).map((field) => (
              <label key={field}>
                {field.replaceAll("_", " ")}
                <input
                  name={field}
                  defaultValue={editing[field] ?? ""}
                  required={[
                    "name",
                    "famous_for",
                    "latitude",
                    "longitude",
                  ].includes(field)}
                  type={
                    ["latitude", "longitude"].includes(field)
                      ? "number"
                      : field === "source_url"
                        ? "url"
                        : "text"
                  }
                  step="any"
                />
              </label>
            ))}
            <div className="field-pair">
              <label>
                Category
                <select name="category" defaultValue={editing.category}>
                  {categories.slice(1).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Dish
                <select name="dish" defaultValue={editing.dish || ""}>
                  <option value="">None</option>
                  {dishes.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="field-pair">
              <label>
                Discovery group
                <select name="discovery_group" defaultValue={placeDiscoveryGroup(editing)}>
                  <option value="food">Famous Food</option>
                  <option value="experiences">Scenic & Culture</option>
                  <option value="specialty_shops">Specialty Shops</option>
                </select>
              </label>
              <label className="curation-check">
                <input type="checkbox" name="listing_verified" defaultChecked={Boolean(editing.listing_verified_at)} />
                Evidence checked — mark as verified
              </label>
            </div>
            <label>
              Verification notes (where and how did you confirm details?)
              <textarea name="verification_notes" rows={3} defaultValue={editing.verification_notes || ""} maxLength={700}
                placeholder="Checked shop identity and entrance coordinates against official source on..." />
            </label>
            <label className="curation-check">
              <input type="checkbox" name="is_hidden_gem" defaultChecked={Boolean(editing.is_hidden_gem)} />
              Hidden Gem — verified local favourite, not just a popular chain
            </label>
            <label>
              Why is this a Hidden Gem?
              <input name="hidden_gem_reason" defaultValue={editing.hidden_gem_reason || ""} maxLength={300}
                placeholder="Locals recommend it for..." />
            </label>
            <label>
              Replace photo
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp"
              />
            </label>
            <label>
              Review decision
              <select name="status" defaultValue={editing.status}>
                <option value="pending">Keep pending</option>
                <option value="approved">Approve and publish</option>
                <option value="rejected">Reject / unpublish</option>
              </select>
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : "Save review"}
            </button>
          </form>
        </Modal>
      )}
    </main>
  );
}
