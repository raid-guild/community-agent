'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { AdminBadgeCatalogEntry } from '@/lib/api';
import { getClientApiPath, getClientAssetPath } from '@/lib/client-api';

interface AdminBadgesManagerProps {
  initialBadges: AdminBadgeCatalogEntry[];
}

interface BadgeFormState {
  slug: string;
  label: string;
  description: string;
  imageUrl: string;
}

function slugifyValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createEmptyForm(): BadgeFormState {
  return {
    slug: '',
    label: '',
    description: '',
    imageUrl: '',
  };
}

function sortBadges(badges: AdminBadgeCatalogEntry[]) {
  return [...badges].sort((left, right) => left.label.localeCompare(right.label));
}

export function AdminBadgesManager({ initialBadges }: AdminBadgesManagerProps) {
  const router = useRouter();
  const [badges, setBadges] = useState(() => sortBadges(initialBadges));
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<BadgeFormState>(() => createEmptyForm());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const imagePreviewUrl = getClientAssetPath(form.imageUrl);

  function resetForm() {
    setEditingSlug(null);
    setForm(createEmptyForm());
  }

  function handleEdit(badge: AdminBadgeCatalogEntry) {
    setEditingSlug(badge.slug);
    setForm({
      slug: badge.slug,
      label: badge.label,
      description: badge.description || '',
      imageUrl: badge.imageUrl || '',
    });
    setMessage(null);
    setError(null);
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsImageUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(getClientApiPath('/api/admin/uploads/badge-image'), {
      method: 'POST',
      body: formData,
    });

    setIsImageUploading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error || 'Unable to upload badge image');
      return;
    }

    const payload = (await response.json()) as { imageUrl?: string };
    if (payload.imageUrl) {
      setForm((current) => ({ ...current, imageUrl: payload.imageUrl || '' }));
    }

    setMessage('Badge image uploaded.');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const payload = {
      slug: form.slug.trim(),
      label: form.label.trim(),
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
    };

    const endpoint = editingSlug ? getClientApiPath(`/api/admin/badges/${editingSlug}`) : getClientApiPath('/api/admin/badges');
    const method = editingSlug ? 'PATCH' : 'POST';
    const response = await fetch(endpoint, {
      method,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responsePayload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(responsePayload?.error || 'Unable to save badge');
      return;
    }

    const responsePayload = (await response.json()) as { badge?: AdminBadgeCatalogEntry };
    if (responsePayload.badge) {
      const savedBadge = responsePayload.badge;
      setBadges((current) => {
        const next = current.filter((badge) => badge.slug !== savedBadge.slug);
        next.push(savedBadge);
        return sortBadges(next);
      });
    }

    setMessage(editingSlug ? 'Badge updated.' : 'Badge created.');
    resetForm();
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="panel-grid">
      <form className="card stack" onSubmit={handleSubmit}>
        <div className="section-title section-title--stacked">
          <div>
            <p className="section-title__eyebrow">Badge editor</p>
            <h2 className="section-title__title">{editingSlug ? 'Edit reusable badge' : 'Create reusable badge'}</h2>
            <p className="section-title__copy">
              Manage the reusable badge catalog here. Awarding still runs through the ops board so issuance stays explicit.
            </p>
          </div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span className="field__label">Badge label</span>
            <input
              className="field__input"
              value={form.label}
              onChange={(event) => {
                const nextLabel = event.target.value;
                setForm((current) => {
                  const shouldSyncSlug = !editingSlug && (!current.slug || current.slug === slugifyValue(current.label));
                  return {
                    ...current,
                    label: nextLabel,
                    slug: shouldSyncSlug ? slugifyValue(nextLabel) : current.slug,
                  };
                });
              }}
              placeholder="Guild Steward"
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Badge slug</span>
            <input
              className="field__input mono"
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: slugifyValue(event.target.value) }))}
              placeholder="guild-steward"
              disabled={Boolean(editingSlug)}
              required
            />
          </label>
          <label className="field field--full">
            <span className="field__label">Description</span>
            <textarea
              className="field__input field__textarea"
              rows={4}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="What this badge recognizes"
            />
          </label>
          <div className="field field--full">
            <span className="field__label">Badge image</span>
            <div className="asset-preview asset-preview--badge">
              {imagePreviewUrl ? (
                <img alt="Badge preview" className="asset-preview__image asset-preview__image--badge" src={imagePreviewUrl} />
              ) : (
                <div className="asset-preview__placeholder asset-preview__image asset-preview__image--badge">
                  {(form.label || 'Badge').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="asset-preview__copy">
                <label className="button--secondary button--small asset-preview__upload">
                  <input accept="image/*" className="asset-preview__input" onChange={(event) => void handleImageUpload(event)} type="file" />
                  {isImageUploading ? 'Uploading...' : 'Upload badge image'}
                </label>
                <label className="field">
                  <span className="field__label">Image URL</span>
                  <input
                    className="field__input"
                    value={form.imageUrl}
                    onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                    placeholder="/api/uploads/badges/..."
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {message ? <p className="status">{message}</p> : null}
        {error ? <p className="status status--error">{error}</p> : null}

        <div className="toolbar">
          <button className="button" type="submit" disabled={isPending || isImageUploading}>
            {editingSlug ? (isPending ? 'Saving...' : 'Save badge') : (isPending ? 'Creating...' : 'Create badge')}
          </button>
          {editingSlug ? (
            <button className="button--secondary" type="button" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
          <Link className="button--secondary" href="/app/admin">
            Go to ops board
          </Link>
        </div>
      </form>

      <div className="stack">
        <section className="card stack">
          <div className="section-title section-title--stacked">
            <div>
              <p className="section-title__eyebrow">Badge catalog</p>
              <h2 className="section-title__title">Reusable badges</h2>
              <p className="section-title__copy">Each badge stays reusable. The ops board handles issuing them to one or many members later.</p>
            </div>
          </div>
          <div className="badge-catalog-grid">
            {badges.length ? badges.map((badge) => (
              <article key={badge.slug} className="badge-catalog-card">
                <div className="badge-catalog-card__header">
                  {badge.imageUrl ? (
                    <img alt={`${badge.label} badge`} className="badge-catalog-card__image" src={getClientAssetPath(badge.imageUrl)} />
                  ) : (
                    <div className="badge-catalog-card__image badge-catalog-card__image--placeholder">
                      {badge.label.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="card__eyebrow">{badge.slug}</p>
                    <h3 className="badge-catalog-card__title">{badge.label}</h3>
                  </div>
                </div>
                <p className="card__copy">{badge.description || 'No description yet.'}</p>
                <div className="badge-catalog-card__meta">
                  <span className="tag">Awards: {badge.awardCount}</span>
                  <span className="tag">Updated: {new Date(badge.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="inline-actions">
                  <button className="button--secondary button--small" type="button" onClick={() => handleEdit(badge)}>
                    Edit
                  </button>
                </div>
              </article>
            )) : (
              <div className="empty-state">
                <h3 className="card__title">No badges yet</h3>
                <p className="card__copy">Create the first reusable badge here, then issue it from the ops board.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}