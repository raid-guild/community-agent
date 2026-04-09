'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import type {
  CommunityRoleCatalogEntry,
  IntegrationMeta,
  MemberProfile,
  ProfileVisibilitySettings,
  SkillCatalogEntry,
  VisibilityScope,
} from '@/lib/api';
import { getClientApiPath, getClientAssetPath } from '@/lib/client-api';

interface AccountEditorProps {
  profile: MemberProfile;
  integrations: IntegrationMeta | null;
  skillsCatalog: SkillCatalogEntry[];
  communityRolesCatalog: CommunityRoleCatalogEntry[];
}

interface FormState {
  handle: string;
  displayName: string;
  bio: string;
  location: string;
  avatarUrl: string;
  walletAddress: string;
  visibility: string;
  visibilitySettings: ProfileVisibilitySettings;
  skillSlugs: string[];
  communityRoleSlugs: string[];
}

const defaultVisibilitySettings: ProfileVisibilitySettings = {
  bio: 'public',
  location: 'public',
  links: 'public',
  skills: 'public',
  communityRoles: 'public',
  badges: 'public',
  cohorts: 'public',
};

const visibilityFieldOptions: Array<{ key: keyof ProfileVisibilitySettings; label: string; copy: string }> = [
  { key: 'bio', label: 'Bio', copy: 'Short intro text used on cards and the public profile hero.' },
  { key: 'location', label: 'Location', copy: 'City, region, country, or remote status.' },
  { key: 'links', label: 'Links', copy: 'External references like portfolio, socials, or project pages.' },
  { key: 'skills', label: 'Skills', copy: 'Skill tags shown in discovery cards and profile sections.' },
  { key: 'communityRoles', label: 'Community roles', copy: 'Role tags shown on the public profile.' },
  { key: 'badges', label: 'Badges', copy: 'Recognition badges shown on cards and profiles.' },
];

function mapLabelsToSlugs(labels: string[], catalog: Array<{ label: string; slug: string }>) {
  const selected = new Set(labels);
  return catalog.filter((entry) => selected.has(entry.label)).map((entry) => entry.slug);
}

function normalizeVisibilitySettings(value: MemberProfile['visibilitySettings']): ProfileVisibilitySettings {
  return {
    bio: value?.bio ?? defaultVisibilitySettings.bio,
    location: value?.location ?? defaultVisibilitySettings.location,
    links: value?.links ?? defaultVisibilitySettings.links,
    skills: value?.skills ?? defaultVisibilitySettings.skills,
    communityRoles: value?.communityRoles ?? defaultVisibilitySettings.communityRoles,
    badges: value?.badges ?? defaultVisibilitySettings.badges,
    cohorts: value?.cohorts ?? defaultVisibilitySettings.cohorts,
  };
}

function createInitialState(
  profile: MemberProfile,
  skillsCatalog: SkillCatalogEntry[],
  communityRolesCatalog: CommunityRoleCatalogEntry[],
): FormState {
  return {
    handle: profile.handle,
    displayName: profile.displayName,
    bio: profile.bio || '',
    location: profile.location || '',
    avatarUrl: profile.avatarUrl || '',
    walletAddress: profile.walletAddress || '',
    visibility: profile.visibility,
    visibilitySettings: normalizeVisibilitySettings(profile.visibilitySettings),
    skillSlugs: mapLabelsToSlugs(profile.skills, skillsCatalog),
    communityRoleSlugs: mapLabelsToSlugs(profile.communityRoles, communityRolesCatalog),
  };
}

export function AccountEditor({
  profile,
  integrations,
  skillsCatalog,
  communityRolesCatalog,
}: AccountEditorProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => createInitialState(profile, skillsCatalog, communityRolesCatalog));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const avatarPreviewUrl = getClientAssetPath(form.avatarUrl);
  const selectedSkills = skillsCatalog.filter((entry) => form.skillSlugs.includes(entry.slug));
  const selectedCommunityRoles = communityRolesCatalog.filter((entry) => form.communityRoleSlugs.includes(entry.slug));

  const completion = useMemo(() => {
    const checks = [
      Boolean(form.displayName.trim()),
      Boolean(form.bio.trim()),
      Boolean(form.location.trim()),
      Boolean(form.avatarUrl.trim()),
      form.skillSlugs.length >= 2,
    ];

    const score = checks.filter(Boolean).length;
    return Math.round((score / checks.length) * 100);
  }, [form.avatarUrl, form.bio, form.displayName, form.location, form.skillSlugs.length]);

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const response = await fetch(getClientApiPath('/api/profile/me'), {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        handle: form.handle,
        displayName: form.displayName,
        bio: form.bio,
        location: form.location,
        avatarUrl: form.avatarUrl || null,
        walletAddress: form.walletAddress || null,
        skillSlugs: form.skillSlugs,
        communityRoleSlugs: form.communityRoleSlugs,
        visibility: form.visibility,
        visibilitySettings: form.visibilitySettings,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error || 'Unable to save profile');
      return;
    }

    setMessage('Profile saved.');
    startTransition(() => {
      router.refresh();
    });
  }

  function updateFieldVisibility(key: keyof ProfileVisibilitySettings, nextValue: VisibilityScope) {
    setForm((current) => ({
      ...current,
      visibilitySettings: {
        ...current.visibilitySettings,
        [key]: nextValue,
      },
    }));
  }

  function toggleSkill(slug: string) {
    setForm((current) => ({
      ...current,
      skillSlugs: current.skillSlugs.includes(slug)
        ? current.skillSlugs.filter((value) => value !== slug)
        : [...current.skillSlugs, slug],
    }));
  }

  function toggleCommunityRole(slug: string) {
    setForm((current) => ({
      ...current,
      communityRoleSlugs: current.communityRoleSlugs.includes(slug)
        ? current.communityRoleSlugs.filter((value) => value !== slug)
        : [...current.communityRoleSlugs, slug],
    }));
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsAvatarUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(getClientApiPath('/api/profile/me/avatar'), {
      method: 'POST',
      body: formData,
    });

    setIsAvatarUploading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error || 'Unable to upload avatar');
      return;
    }

    const payload = (await response.json()) as { avatarUrl?: string };
    if (payload.avatarUrl) {
      setForm((current) => ({ ...current, avatarUrl: payload.avatarUrl || '' }));
    }

    setMessage('Avatar uploaded.');
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="stack">
      <section className="metric-grid">
        <article className="status-card">
          <p className="status-card__label">Profile completeness</p>
          <p className="status-card__value">{completion}%</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Skills listed</p>
          <p className="status-card__value">{form.skillSlugs.length}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Community roles</p>
          <p className="status-card__value">{form.communityRoleSlugs.length}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Chat linking</p>
          <p className="status-card__value">{integrations?.displayName || 'Off'}</p>
        </article>
      </section>

      <div className="panel-grid">
        <form className="card stack" onSubmit={submitForm}>
          <div className="section-title section-title--stacked">
            <div>
              <p className="section-title__eyebrow">Account</p>
              <h2 className="section-title__title">Edit essentials</h2>
              <p className="section-title__copy">
                Keep the editable fields lean for now. Skills and connected accounts will expand as the backend surface grows.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="field__label">Display name</span>
              <input
                className="field__input"
                value={form.displayName}
                onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span className="field__label">Handle</span>
              <input
                className="field__input"
                value={form.handle}
                onChange={(event) => setForm((current) => ({ ...current, handle: event.target.value }))}
                required
              />
            </label>
            <label className="field field--full">
              <span className="field__label">Bio</span>
              <textarea
                className="field__input field__textarea"
                rows={5}
                value={form.bio}
                onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                placeholder="Tell people what you work on."
              />
            </label>
            <label className="field">
              <span className="field__label">Location</span>
              <input
                className="field__input"
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                placeholder="City, country, or remote"
              />
            </label>
            <label className="field">
              <span className="field__label">Visibility</span>
              <select
                className="field__input"
                value={form.visibility}
                onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value }))}
              >
                <option value="public">Public</option>
                <option value="members">Members only</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Avatar URL</span>
              <input
                className="field__input"
                value={form.avatarUrl}
                onChange={(event) => setForm((current) => ({ ...current, avatarUrl: event.target.value }))}
                placeholder="https://..."
              />
            </label>
            <div className="field field--full">
              <span className="field__label">Avatar image</span>
              <div className="asset-preview asset-preview--avatar">
                {avatarPreviewUrl ? (
                  <img alt={`${form.displayName || form.handle} avatar`} className="asset-preview__image asset-preview__image--avatar" src={avatarPreviewUrl} />
                ) : (
                  <div className="asset-preview__placeholder asset-preview__image asset-preview__image--avatar">
                    {(form.displayName || form.handle || '?').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="asset-preview__copy">
                  <label className="button--secondary button--small asset-preview__upload">
                    <input accept="image/*" className="asset-preview__input" onChange={(event) => void handleAvatarUpload(event)} type="file" />
                    {isAvatarUploading ? 'Uploading...' : 'Upload avatar'}
                  </label>
                  <p className="form-note">Uploads are stored in the workspace and served via /api/uploads for Pinata-safe routing.</p>
                </div>
              </div>
            </div>
            <label className="field">
              <span className="field__label">Wallet address</span>
              <input
                className="field__input mono"
                value={form.walletAddress}
                onChange={(event) => setForm((current) => ({ ...current, walletAddress: event.target.value }))}
                placeholder="0x..."
              />
            </label>
            <div className="field field--full stack stack--tight">
              <span className="field__label">Skills</span>
              <p className="form-note">Choose the skills people can use to discover you in the directory.</p>
              <div className="selection-grid">
                {skillsCatalog.map((entry) => {
                  const checked = form.skillSlugs.includes(entry.slug);

                  return (
                    <label key={entry.id} className={`selection-option${checked ? ' selection-option--active' : ''}`}>
                      <input checked={checked} onChange={() => toggleSkill(entry.slug)} type="checkbox" />
                      <span>{entry.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="field field--full stack stack--tight">
              <span className="field__label">Community roles</span>
              <p className="form-note">Choose the roles that best describe how you participate.</p>
              <div className="selection-grid">
                {communityRolesCatalog.map((entry) => {
                  const checked = form.communityRoleSlugs.includes(entry.slug);

                  return (
                    <label key={entry.id} className={`selection-option${checked ? ' selection-option--active' : ''}`}>
                      <input checked={checked} onChange={() => toggleCommunityRole(entry.slug)} type="checkbox" />
                      <span>{entry.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="field field--full stack stack--tight">
              <span className="field__label">Field visibility</span>
              <p className="form-note">
                Always visible: avatar, handle, display name, and points. Use these controls for the rest of the public profile surface.
              </p>
              <div className="visibility-settings-grid">
                {visibilityFieldOptions.map((option) => (
                  <label key={option.key} className="visibility-setting-card">
                    <span className="visibility-setting-card__title">{option.label}</span>
                    <span className="visibility-setting-card__copy">{option.copy}</span>
                    <select
                      className="field__input"
                      value={form.visibilitySettings[option.key]}
                      onChange={(event) => updateFieldVisibility(option.key, event.target.value as VisibilityScope)}
                    >
                      <option value="public">Public</option>
                      <option value="members">Members only</option>
                      <option value="private">Only me</option>
                    </select>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {message ? <p className="status">{message}</p> : null}
          {error ? <p className="status status--error">{error}</p> : null}

          <div className="toolbar">
            <button className="button" type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </form>

        <div className="stack">
          <article className="card">
            <p className="card__eyebrow">Current skills</p>
            <h2 className="card__title">{selectedSkills.length} listed</h2>
            <div className="tag-list">
              {selectedSkills.length
                ? selectedSkills.map((skill) => (
                    <span key={skill.id} className="tag">
                      {skill.label}
                    </span>
                  ))
                : <span className="tag">No skills yet</span>}
            </div>
          </article>
          <article className="card">
            <p className="card__eyebrow">Connected accounts</p>
            <h2 className="card__title">Integration posture</h2>
            <p className="card__copy">
              {integrations?.displayName
                ? `${integrations.displayName} linking is configured in the deployment.`
                : 'No community provider is configured yet.'}
            </p>
            <div className="tag-list">
              <span className="tag">Prism: {integrations?.prism.enabled ? 'Enabled' : 'Later'}</span>
              <span className="tag">Visibility: {form.visibility}</span>
            </div>
          </article>
          <article className="card">
            <p className="card__eyebrow">Role surface</p>
            <h2 className="card__title">Community roles</h2>
            <div className="tag-list">
              {selectedCommunityRoles.length
                ? selectedCommunityRoles.map((role) => (
                    <span key={role.id} className="tag">
                      {role.label}
                    </span>
                  ))
                : <span className="tag">No roles yet</span>}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}