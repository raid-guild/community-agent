'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { getClientApiPath, getClientAssetPath } from '@/lib/client-api';
import { type SiteContent } from '@/lib/site-content';
import { stringifySiteContent, validateSiteContentJson } from '@/lib/site-content-form';

interface AdminSiteContentEditorProps {
  initialContent: SiteContent;
}

export function AdminSiteContentEditor({ initialContent }: AdminSiteContentEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => stringifySiteContent(initialContent));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const validation = validateSiteContentJson(draft);
  const parsedContent = validation.ok ? validation.parsed : null;
  const logoPreviewUrl = parsedContent?.shell.logoUrl ? getClientAssetPath(parsedContent.shell.logoUrl) : '';

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    const response = await fetch(getClientApiPath('/api/admin/site-content'), {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ siteContent: validation.parsed }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error || 'Unable to save brand and copy JSON.');
      return;
    }

    const payload = (await response.json()) as { siteContent?: SiteContent };
    if (payload.siteContent) {
      setDraft(stringifySiteContent(payload.siteContent));
    }

    setMessage('Brand and copy saved. Refreshing server-rendered views.');
    startTransition(() => {
      router.refresh();
    });
  }

  function handleFormat() {
    setMessage(null);
    setError(null);

    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setDraft(stringifySiteContent(validation.parsed));
  }

  function handleReset() {
    setMessage(null);
    setError(null);
    setDraft(stringifySiteContent(initialContent));
  }

  return (
    <div className="panel-grid">
      <form className="card stack" onSubmit={handleSave}>
        <div className="section-title section-title--stacked">
          <div>
            <p className="section-title__eyebrow">Runtime content</p>
            <h2 className="section-title__title">Edit brand and copy JSON</h2>
            <p className="section-title__copy">
              This editor writes to the runtime content file, so shell branding, nav labels, and page titles or intros update without a site rebuild.
            </p>
          </div>
        </div>

        <label className="field field--full">
          <span className="field__label">Site content JSON</span>
          <textarea
            className="field__input field__textarea json-editor mono"
            value={draft}
            rows={30}
            onChange={(event) => setDraft(event.target.value)}
            spellCheck={false}
          />
        </label>

        <p className="form-note">
          Required shape: <span className="mono">shell</span>, <span className="mono">navigation</span>, and <span className="mono">pages</span> with string values for each known key.
        </p>

        {validation.ok ? <p className="status">JSON shape validated locally.</p> : null}
        {message ? <p className="status">{message}</p> : null}
        {error ? <p className="status status--error">{error}</p> : null}

        <div className="toolbar">
          <button className="button" type="submit" disabled={isPending || !validation.ok}>
            {isPending ? 'Saving...' : 'Save JSON'}
          </button>
          <button className="button--secondary" type="button" onClick={handleFormat}>
            Format JSON
          </button>
          <button className="button--secondary" type="button" onClick={handleReset}>
            Reset draft
          </button>
        </div>
      </form>

      <section className="stack">
        <section className="card stack">
          <div className="section-title section-title--stacked">
            <div>
              <p className="section-title__eyebrow">Preview</p>
              <h2 className="section-title__title">Current brand summary</h2>
            </div>
          </div>
          {parsedContent ? (
            <div className="stack stack--tight">
              <div className="brand-preview">
                {logoPreviewUrl ? (
                  <img className="brand-preview__logo" src={logoPreviewUrl} alt={parsedContent.shell.logoAlt} />
                ) : (
                  <div className="brand-preview__logo brand-preview__logo--placeholder">
                    {parsedContent.shell.brandName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="stack stack--tight">
                  <strong>{parsedContent.shell.brandName}</strong>
                  <span className="muted">{parsedContent.shell.sidebarTitle}</span>
                </div>
              </div>
              <div className="tag-list">
                <span className="tag">{parsedContent.navigation.overview}</span>
                <span className="tag">{parsedContent.navigation.home}</span>
                <span className="tag">{parsedContent.navigation.members}</span>
                <span className="tag">{parsedContent.navigation.leaderboard}</span>
                <span className="tag">{parsedContent.navigation.admin}</span>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h3 className="card__title">Fix validation first</h3>
              <p className="card__copy">A preview appears once the JSON parses and matches the required shape.</p>
            </div>
          )}
        </section>

        <section className="card stack">
          <div className="section-title section-title--stacked">
            <div>
              <p className="section-title__eyebrow">Scope</p>
              <h2 className="section-title__title">What this editor controls</h2>
            </div>
          </div>
          <div className="step-list">
            <div className="step-list__item">
              <strong>Brand lockup</strong>
              <p>Brand name, optional logo, and sidebar copy in the shell.</p>
            </div>
            <div className="step-list__item">
              <strong>Primary navigation</strong>
              <p>Top-level nav labels like overview, home, members, leaderboard, and admin.</p>
            </div>
            <div className="step-list__item">
              <strong>Page headings</strong>
              <p>Server-rendered page titles and intro text for the current route wrappers.</p>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}