'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { getClientApiPath } from '@/lib/client-api';
import { stringifyHomeModuleConfig, type HomeModuleRecord } from '@/lib/home-modules';

interface AdminHomeModulesManagerProps {
  initialModules: HomeModuleRecord[];
}

function sortModules(modules: HomeModuleRecord[]) {
  return [...modules].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder;
    }

    return left.label.localeCompare(right.label);
  });
}

function buildDrafts(modules: HomeModuleRecord[]) {
  return Object.fromEntries(modules.map((module) => [module.id, stringifyHomeModuleConfig(module.config)]));
}

function parseConfigDraft(draft: string) {
  const parsed = JSON.parse(draft) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Config must be a JSON object.');
  }

  return parsed as Record<string, unknown>;
}

export function AdminHomeModulesManager({ initialModules }: AdminHomeModulesManagerProps) {
  const router = useRouter();
  const [modules, setModules] = useState(() => sortModules(initialModules));
  const [configDrafts, setConfigDrafts] = useState(() => buildDrafts(initialModules));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const enabledCount = modules.filter((module) => module.enabled).length;
  const restrictedCount = modules.filter((module) => Boolean(module.visibilityRole)).length;
  const nextDisplayOrder = modules.length ? Math.max(...modules.map((module) => module.displayOrder)) + 1 : 1;

  function updateModule(moduleId: string, patch: Partial<HomeModuleRecord>) {
    setModules((current) => sortModules(current.map((module) => (
      module.id === moduleId
        ? { ...module, ...patch }
        : module
    ))));
  }

  function updateConfigDraft(moduleId: string, value: string) {
    setConfigDrafts((current) => ({
      ...current,
      [moduleId]: value,
    }));
  }

  function handleReset() {
    setMessage(null);
    setError(null);
    setModules(sortModules(initialModules));
    setConfigDrafts(buildDrafts(initialModules));
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const parsedConfigs: Record<string, Record<string, unknown>> = {};

    for (const module of modules) {
      try {
        parsedConfigs[module.id] = parseConfigDraft(configDrafts[module.id] || '{}');
      } catch (draftError) {
        setError(`${module.label}: ${draftError instanceof Error ? draftError.message : 'Invalid JSON config.'}`);
        return;
      }
    }

    const response = await fetch(getClientApiPath('/api/admin/home-modules'), {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        modules: modules.map((module) => ({
          id: module.id,
          enabled: module.enabled,
          displayOrder: module.displayOrder,
          visibilityRole: module.visibilityRole?.trim() || null,
          config: parsedConfigs[module.id],
        })),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error || 'Unable to save home modules.');
      return;
    }

    const payload = (await response.json()) as { modules?: HomeModuleRecord[] };

    if (payload.modules) {
      const nextModules = sortModules(payload.modules);
      setModules(nextModules);
      setConfigDrafts(buildDrafts(nextModules));
    }

    setMessage('Home modules saved. Refreshing server-rendered views.');
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="stack admin-home-modules-layout">
      <section className="metric-grid">
        <article className="status-card">
          <p className="status-card__label">Enabled modules</p>
          <p className="status-card__value">{enabledCount}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Disabled modules</p>
          <p className="status-card__value">{modules.length - enabledCount}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Restricted modules</p>
          <p className="status-card__value">{restrictedCount}</p>
        </article>
        <article className="status-card">
          <p className="status-card__label">Next display order</p>
          <p className="status-card__value">{nextDisplayOrder}</p>
        </article>
      </section>

      <form className="stack" onSubmit={handleSave}>
        <div className="module-list">
          {modules.map((module) => {
          let configError: string | null = null;

          try {
            parseConfigDraft(configDrafts[module.id] || '{}');
          } catch (draftError) {
            configError = draftError instanceof Error ? draftError.message : 'Invalid JSON config.';
          }

          return (
            <section key={module.id} className="card stack module-list__item">
              <div className="section-title section-title--stacked">
                <div>
                  <p className="section-title__eyebrow">{module.type}</p>
                  <h2 className="section-title__title">{module.label}</h2>
                  <p className="section-title__copy">{module.description}</p>
                </div>
                <span className={`status-chip status-chip--${module.enabled ? 'opened' : 'closed'}`}>
                  {module.enabled ? 'enabled' : 'disabled'}
                </span>
              </div>

              <label className="member-selector__option">
                <input
                  checked={module.enabled}
                  onChange={(event) => updateModule(module.id, { enabled: event.target.checked })}
                  type="checkbox"
                />
                <span>
                  <strong>Enabled on member home</strong>
                  <span>This module only renders for members when it is enabled and the visibility role matches.</span>
                </span>
              </label>

              <div className="form-grid">
                <label className="field">
                  <span className="field__label">Display order</span>
                  <input
                    className="field__input"
                    min={0}
                    onChange={(event) => updateModule(module.id, { displayOrder: Number(event.target.value) || 0 })}
                    type="number"
                    value={module.displayOrder}
                  />
                </label>
                <label className="field">
                  <span className="field__label">Visibility role</span>
                  <input
                    className="field__input"
                    onChange={(event) => updateModule(module.id, { visibilityRole: event.target.value || null })}
                    placeholder="Leave blank for all signed-in members"
                    type="text"
                    value={module.visibilityRole ?? ''}
                  />
                </label>
              </div>

              <label className="field field--full">
                <span className="field__label">Config JSON</span>
                <textarea
                  className="field__input field__textarea mono"
                  onChange={(event) => updateConfigDraft(module.id, event.target.value)}
                  rows={10}
                  spellCheck={false}
                  value={configDrafts[module.id] || '{}'}
                />
              </label>

              {configError ? <p className="status status--error">{configError}</p> : <p className="status">Local config JSON looks valid.</p>}
            </section>
          );
          })}
        </div>

        {message ? <p className="status">{message}</p> : null}
        {error ? <p className="status status--error">{error}</p> : null}

        <div className="toolbar">
          <button className="button" disabled={isPending} type="submit">
            {isPending ? 'Saving...' : 'Save modules'}
          </button>
          <button className="button--secondary" onClick={handleReset} type="button">
            Reset draft
          </button>
        </div>
      </form>
    </div>
  );
}