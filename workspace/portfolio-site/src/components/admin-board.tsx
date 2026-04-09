'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type {
  AdminChangeRequest,
  AdminChangeRequestApplyResult,
  AdminUserSummary,
  BadgeCatalogEntry,
} from '@/lib/api';
import { getClientApiPath, getClientAssetPath } from '@/lib/client-api';
import { type SiteContent } from '@/lib/site-content';
import { stringifySiteContent, validateSiteContentJson } from '@/lib/site-content-form';

interface AdminBoardProps {
  initialRequests: AdminChangeRequest[];
  users: AdminUserSummary[];
  badges: BadgeCatalogEntry[];
  initialSiteContent: SiteContent;
}

const stateOptions = ['pending', 'opened', 'closed'] as const;
const actionableRequestTypes = new Set(['points_adjustment', 'badge_create', 'badge_award', 'badge_request', 'site_content_update']);

function formatSignedDelta(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function readPayloadString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readPayloadUserIds(payload: Record<string, unknown>) {
  return Array.isArray(payload.userIds) ? payload.userIds.filter((value): value is string => typeof value === 'string') : [];
}

function readBadgeSummary(payload: Record<string, unknown>) {
  const nestedBadge = payload.badge && typeof payload.badge === 'object' && !Array.isArray(payload.badge)
    ? payload.badge as Record<string, unknown>
    : {};

  return readPayloadString(payload.badgeLabel)
    || readPayloadString(payload.badgeSlug)
    || readPayloadString(nestedBadge.label)
    || readPayloadString(nestedBadge.slug)
    || 'Badge';
}

function readBadgeImageUrl(payload: Record<string, unknown>) {
  const nestedBadge = payload.badge && typeof payload.badge === 'object' && !Array.isArray(payload.badge)
    ? payload.badge as Record<string, unknown>
    : {};

  return readPayloadString(nestedBadge.imageUrl) || readPayloadString(nestedBadge.image_url);
}

function readSiteContentPayload(payload: Record<string, unknown>) {
  const value = payload.siteContent;
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readSiteContentSummary(payload: Record<string, unknown>) {
  const siteContent = readSiteContentPayload(payload);
  const shell = siteContent?.shell && typeof siteContent.shell === 'object' && !Array.isArray(siteContent.shell)
    ? siteContent.shell as Record<string, unknown>
    : null;
  const brandName = readPayloadString(shell?.brandName);
  const sidebarTitle = readPayloadString(shell?.sidebarTitle);

  if (brandName && sidebarTitle) {
    return `${brandName} · ${sidebarTitle}`;
  }

  if (brandName) {
    return `Brand: ${brandName}`;
  }

  return 'Update runtime brand and page copy';
}

function readSiteContentLogoUrl(payload: Record<string, unknown>) {
  const siteContent = readSiteContentPayload(payload);
  const shell = siteContent?.shell && typeof siteContent.shell === 'object' && !Array.isArray(siteContent.shell)
    ? siteContent.shell as Record<string, unknown>
    : null;

  return readPayloadString(shell?.logoUrl);
}

function summarizeRequest(request: AdminChangeRequest) {
  const payload = request.payload;

  if (request.requestType === 'points_adjustment') {
    const userIds = readPayloadUserIds(payload);
    const delta = Number(payload.delta);
    const reason = readPayloadString(payload.reason);

    return `${Number.isFinite(delta) ? formatSignedDelta(delta) : '+0'} to ${userIds.length} member${userIds.length === 1 ? '' : 's'}${reason ? ` · ${reason}` : ''}`;
  }

  if (request.requestType === 'badge_create') {
    return `Create reusable badge: ${readBadgeSummary(payload)}`;
  }

  if (request.requestType === 'badge_award') {
    const userIds = readPayloadUserIds(payload);
    return `${readBadgeSummary(payload)} for ${userIds.length} member${userIds.length === 1 ? '' : 's'}`;
  }

  if (request.requestType === 'badge_request') {
    const userIds = readPayloadUserIds(payload);
    const label = readBadgeSummary(payload);

    if (userIds.length) {
      return `${label} for ${userIds.length} member${userIds.length === 1 ? '' : 's'}`;
    }

    return `Create badge: ${label}`;
  }

  if (request.requestType === 'site_content_update') {
    return readSiteContentSummary(payload);
  }

  return 'General ops workflow';
}

export function AdminBoard({ initialRequests, users, badges, initialSiteContent }: AdminBoardProps) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [title, setTitle] = useState('');
  const [requestType, setRequestType] = useState('ops_request');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [pointsDelta, setPointsDelta] = useState('10');
  const [reason, setReason] = useState('');
  const [badgeSlug, setBadgeSlug] = useState('');
  const [badgeLabel, setBadgeLabel] = useState('');
  const [badgeDescription, setBadgeDescription] = useState('');
  const [badgeImageUrl, setBadgeImageUrl] = useState('');
  const [selectedBadgeSlug, setSelectedBadgeSlug] = useState('');
  const [siteContentDraft, setSiteContentDraft] = useState(() => stringifySiteContent(initialSiteContent));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBadgeImageUploading, setIsBadgeImageUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selectedBadge = badges.find((badge) => badge.slug === selectedBadgeSlug) ?? null;
  const siteContentValidation = validateSiteContentJson(siteContentDraft);

  async function refreshBoard() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    let requestPayload: Record<string, unknown>;

    try {
      requestPayload = (() => {
      if (requestType === 'points_adjustment') {
        return {
          userIds: selectedUserIds,
          delta: Number(pointsDelta),
          reason,
        };
      }

      if (requestType === 'badge_create') {
        return {
          badge: {
            ...(badgeSlug.trim() ? { slug: badgeSlug.trim() } : {}),
            ...(badgeLabel.trim() ? { label: badgeLabel.trim() } : {}),
            ...(badgeDescription.trim() ? { description: badgeDescription.trim() } : {}),
            ...(badgeImageUrl.trim() ? { imageUrl: badgeImageUrl.trim() } : {}),
          },
        };
      }

      if (requestType === 'badge_award') {
        return {
          userIds: selectedUserIds,
          reason,
          badgeSlug: selectedBadgeSlug,
          ...(selectedBadge ? { badgeLabel: selectedBadge.label } : {}),
        };
      }

      if (requestType === 'site_content_update') {
        if (!siteContentValidation.ok) {
          throw new Error(siteContentValidation.error);
        }

        return {
          siteContent: siteContentValidation.parsed,
        };
      }

      return {};
      })();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create change request');
      return;
    }

    const response = await fetch(getClientApiPath('/api/admin/change-requests'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        title,
        requestType,
        priority,
        payload: requestPayload,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error || 'Unable to create change request');
      return;
    }

    const responsePayload = (await response.json()) as { changeRequest?: AdminChangeRequest };
    if (responsePayload.changeRequest) {
      setRequests((current) => [responsePayload.changeRequest!, ...current]);
    }

    setTitle('');
    setRequestType('ops_request');
    setPriority('normal');
    setSelectedUserIds([]);
    setPointsDelta('10');
    setReason('');
    setBadgeSlug('');
    setBadgeLabel('');
    setBadgeDescription('');
    setBadgeImageUrl('');
    setSelectedBadgeSlug('');
    setSiteContentDraft(stringifySiteContent(initialSiteContent));
    setMessage('Change request created.');
    refreshBoard();
  }

  async function handleBadgeImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsBadgeImageUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(getClientApiPath('/api/admin/uploads/badge-image'), {
      method: 'POST',
      body: formData,
    });

    setIsBadgeImageUploading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error || 'Unable to upload badge image');
      return;
    }

    const payload = (await response.json()) as { imageUrl?: string };
    if (payload.imageUrl) {
      setBadgeImageUrl(payload.imageUrl);
    }

    setMessage('Badge image uploaded.');
  }

  async function handleStateChange(changeRequestId: string, nextState: AdminChangeRequest['state']) {
    setError(null);
    setMessage(null);

    const response = await fetch(getClientApiPath(`/api/admin/change-requests/${changeRequestId}`), {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ state: nextState }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error || 'Unable to update change request');
      return;
    }

    const responsePayload = (await response.json()) as { changeRequest?: AdminChangeRequest };
    if (responsePayload.changeRequest) {
      setRequests((current) =>
        current.map((request) => (request.id === changeRequestId ? responsePayload.changeRequest! : request)),
      );
    }

    refreshBoard();
  }

  async function handleApply(changeRequestId: string) {
    setError(null);
    setMessage(null);

    const response = await fetch(getClientApiPath(`/api/admin/change-requests/${changeRequestId}/apply`), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error || 'Unable to apply change request');
      return;
    }

    const responsePayload = (await response.json()) as {
      changeRequest?: AdminChangeRequest;
      applyResult?: AdminChangeRequestApplyResult;
    };

    if (responsePayload.changeRequest) {
      setRequests((current) =>
        current.map((request) => (request.id === changeRequestId ? responsePayload.changeRequest! : request)),
      );
    }

    if (responsePayload.applyResult?.kind === 'points_adjustment') {
      setMessage(`Applied points request to ${responsePayload.applyResult.affectedUserIds.length} member${responsePayload.applyResult.affectedUserIds.length === 1 ? '' : 's'}.`);
    } else if (responsePayload.applyResult?.kind === 'badge_award' || responsePayload.applyResult?.kind === 'badge_request') {
      const label = responsePayload.applyResult.badgeLabel || responsePayload.applyResult.badgeSlug || 'badge';
      setMessage(`Applied ${label} to ${responsePayload.applyResult.badgeAwardsCreated ?? 0} member${(responsePayload.applyResult.badgeAwardsCreated ?? 0) === 1 ? '' : 's'}.`);
    } else if (responsePayload.applyResult?.kind === 'badge_create') {
      const label = responsePayload.applyResult.badgeLabel || responsePayload.applyResult.badgeSlug || 'badge';
      setMessage(responsePayload.applyResult.badgeCreated ? `Created reusable badge ${label}.` : `Updated reusable badge ${label}.`);
    } else if (responsePayload.applyResult?.kind === 'site_content_update') {
      setMessage('Applied brand and copy update.');
    } else {
      setMessage('Change request applied.');
    }

    refreshBoard();
  }

  function toggleUser(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((value) => value !== userId) : [...current, userId],
    );
  }

  return (
    <div className="stack">
      <section className="card stack">
        <div className="section-title section-title--stacked">
          <div>
            <p className="section-title__eyebrow">Create request</p>
            <h2 className="section-title__title">Open a moderation or ops task</h2>
          </div>
        </div>
        <form className="form-grid" onSubmit={handleCreate}>
          <label className="field field--full">
            <span className="field__label">Title</span>
            <input
              className="field__input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Describe the admin task"
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Request type</span>
            <select className="field__input" value={requestType} onChange={(event) => setRequestType(event.target.value)}>
              <option value="ops_request">Ops request</option>
              <option value="points_adjustment">Points adjustment</option>
              <option value="badge_create">Badge create</option>
              <option value="badge_award">Badge award</option>
              <option value="site_content_update">Brand and copy update</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Priority</span>
            <select
              className="field__input"
              value={priority}
              onChange={(event) => setPriority(event.target.value as typeof priority)}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          {requestType === 'points_adjustment' ? (
            <>
              <label className="field">
                <span className="field__label">Points delta</span>
                <input
                  className="field__input"
                  value={pointsDelta}
                  onChange={(event) => setPointsDelta(event.target.value)}
                  inputMode="numeric"
                  placeholder="10"
                  required
                />
              </label>
              <label className="field">
                <span className="field__label">Reason</span>
                <input
                  className="field__input"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Why these points should be issued"
                  required
                />
              </label>
            </>
          ) : null}
          {requestType === 'badge_create' ? (
            <>
              <label className="field">
                <span className="field__label">Badge label</span>
                <input
                  className="field__input"
                  value={badgeLabel}
                  onChange={(event) => setBadgeLabel(event.target.value)}
                  placeholder="Guild Steward"
                />
              </label>
              <label className="field">
                <span className="field__label">Badge slug</span>
                <input
                  className="field__input mono"
                  value={badgeSlug}
                  onChange={(event) => setBadgeSlug(event.target.value)}
                  placeholder="guild-steward"
                />
              </label>
              <label className="field field--full">
                <span className="field__label">Badge description</span>
                <input
                  className="field__input"
                  value={badgeDescription}
                  onChange={(event) => setBadgeDescription(event.target.value)}
                  placeholder="What this badge recognizes"
                />
              </label>
              <div className="field field--full">
                <span className="field__label">Badge image</span>
                <div className="asset-preview asset-preview--badge">
                  {badgeImageUrl ? (
                    <img alt="Badge preview" className="asset-preview__image asset-preview__image--badge" src={getClientAssetPath(badgeImageUrl)} />
                  ) : (
                    <div className="asset-preview__placeholder asset-preview__image asset-preview__image--badge">Badge</div>
                  )}
                  <div className="asset-preview__copy">
                    <label className="button--secondary button--small asset-preview__upload">
                      <input accept="image/*" className="asset-preview__input" onChange={(event) => void handleBadgeImageUpload(event)} type="file" />
                      {isBadgeImageUploading ? 'Uploading...' : 'Upload badge image'}
                    </label>
                    <p className="form-note">This image is stored in the workspace now and attached when you create the reusable badge.</p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
          {requestType === 'badge_award' ? (
            <>
              <label className="field field--full">
                <span className="field__label">Existing badge</span>
                <select
                  className="field__input"
                  value={selectedBadgeSlug}
                  onChange={(event) => setSelectedBadgeSlug(event.target.value)}
                  required
                >
                  <option value="">Select a badge</option>
                  {badges.map((badge) => (
                    <option key={badge.slug} value={badge.slug}>
                      {badge.label}
                    </option>
                  ))}
                </select>
              </label>
              {selectedBadge ? (
                <div className="field field--full">
                  <div className="asset-preview asset-preview--badge">
                    {selectedBadge.imageUrl ? (
                      <img alt={`${selectedBadge.label} preview`} className="asset-preview__image asset-preview__image--badge" src={getClientAssetPath(selectedBadge.imageUrl)} />
                    ) : (
                      <div className="asset-preview__placeholder asset-preview__image asset-preview__image--badge">
                        {selectedBadge.label.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="asset-preview__copy">
                      <strong>{selectedBadge.label}</strong>
                      <p className="form-note">{selectedBadge.description || 'No description set for this badge yet.'}</p>
                    </div>
                  </div>
                </div>
              ) : null}
              <label className="field field--full">
                <span className="field__label">Reason</span>
                <input
                  className="field__input"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Why this badge should be issued"
                  required
                />
              </label>
            </>
          ) : null}
          {requestType === 'site_content_update' ? (
            <>
              <label className="field field--full">
                <span className="field__label">Brand and copy JSON</span>
                <textarea
                  className="field__input field__textarea json-editor mono"
                  value={siteContentDraft}
                  onChange={(event) => setSiteContentDraft(event.target.value)}
                  rows={22}
                  spellCheck={false}
                  required
                />
              </label>
              <div className="field field--full">
                <div className="toolbar">
                  <button className="button--secondary button--small" type="button" onClick={() => setSiteContentDraft(stringifySiteContent(initialSiteContent))}>
                    Load current content
                  </button>
                  <button
                    className="button--secondary button--small"
                    type="button"
                    onClick={() => {
                      if (siteContentValidation.ok) {
                        setSiteContentDraft(stringifySiteContent(siteContentValidation.parsed));
                        setError(null);
                        return;
                      }

                      setError(siteContentValidation.error);
                    }}
                  >
                    Format JSON
                  </button>
                </div>
                <p className="form-note">
                  Submit a reviewable runtime content change for brand, nav labels, logo URL, and page title or intro copy.
                </p>
                {siteContentValidation.ok ? (
                  <p className="status">Brand and copy JSON validated locally.</p>
                ) : (
                  <p className="status status--error">{siteContentValidation.error}</p>
                )}
              </div>
            </>
          ) : null}
          {(requestType === 'points_adjustment' || requestType === 'badge_award') ? (
            <div className="field field--full">
              <div className="member-selector__toolbar">
                <span className="field__label">Target members</span>
                <div className="inline-actions">
                  <button className="button--secondary button--small" type="button" onClick={() => setSelectedUserIds(users.map((user) => user.id))}>
                    Select all
                  </button>
                  <button className="button--secondary button--small" type="button" onClick={() => setSelectedUserIds([])}>
                    Clear
                  </button>
                </div>
              </div>
              <p className="form-note">
                {requestType === 'badge_award'
                  ? 'Badge awards reuse an existing badge and can target one or many members.'
                  : 'Points requests require at least one target member.'}
              </p>
              <div className="member-selector__list">
                {users.map((user) => {
                  const checked = selectedUserIds.includes(user.id);

                  return (
                    <label key={user.id} className="member-selector__option">
                      <input type="checkbox" checked={checked} onChange={() => toggleUser(user.id)} />
                      <span>
                        <strong>{user.displayName || user.handle || user.email || 'Unknown user'}</strong>
                        <span className="table-subtle mono">{user.email || user.handle || user.id}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="toolbar toolbar--align-end">
            <button className="button" type="submit" disabled={isPending || (requestType === 'site_content_update' && !siteContentValidation.ok)}>Create request</button>
          </div>
        </form>
        {message ? <p className="status">{message}</p> : null}
        {error ? <p className="status status--error">{error}</p> : null}
      </section>

      <section className="card stack">
        <div className="section-title section-title--stacked">
          <div>
            <p className="section-title__eyebrow">Change request board</p>
            <h2 className="section-title__title">Queue and resolution states</h2>
          </div>
        </div>
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Type</th>
                <th>State</th>
                <th>Priority</th>
                <th>Owner</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <strong>{request.title}</strong>
                    <div className="table-subtle mono">{new Date(request.createdAt).toLocaleDateString()}</div>
                    <div className="request-summary">{summarizeRequest(request)}</div>
                    {readBadgeImageUrl(request.payload) || readSiteContentLogoUrl(request.payload) ? (
                      <div className="request-preview">
                        <img alt="Requested asset preview" className="request-preview__image" src={getClientAssetPath(readBadgeImageUrl(request.payload) || readSiteContentLogoUrl(request.payload))} />
                      </div>
                    ) : null}
                  </td>
                  <td>{request.requestType}</td>
                  <td>
                    <span className={`status-chip status-chip--${request.state}`}>{request.state}</span>
                  </td>
                  <td>
                    <span className={`status-chip status-chip--priority-${request.priority}`}>{request.priority}</span>
                  </td>
                  <td>{request.assignedToDisplayName || request.requestedByDisplayName || 'Unassigned'}</td>
                  <td>
                      <details className="actions-menu">
                        <summary className="actions-menu__trigger" aria-label={`Actions for ${request.title}`}>
                          <span aria-hidden="true">...</span>
                        </summary>
                        <div className="actions-menu__content">
                          {actionableRequestTypes.has(request.requestType) && request.state !== 'closed' ? (
                            <button
                              className="button button--small"
                              type="button"
                              onClick={() => void handleApply(request.id)}
                            >
                              Apply &amp; close
                            </button>
                          ) : null}
                          {stateOptions.map((option) => (
                            <button
                              key={option}
                              className="button--secondary button--small"
                              type="button"
                              onClick={() => void handleStateChange(request.id, option)}
                              disabled={request.state === option}
                            >
                              Mark {option}
                            </button>
                          ))}
                        </div>
                      </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}