import { AppShell, Card, MetricCard, PageHeader, StatusPanel, SwimPayBrand, escapeHtml } from '../ui/Components.js';
import type { AdminAuditEvent, BankEvidenceDashboard, BankEvidenceRow } from '../index.js';

export function renderEvidenceReviewPage(dashboard: BankEvidenceDashboard, auditEvents: AdminAuditEvent[]): string {
  const evidenceRows = [...(dashboard.review_queue ?? []), ...(dashboard.recent_evidence ?? [])];
  return AppShell({
    title: 'Preuves de reception',
    chrome: 'plain',
    children: `<section class="screen merchant-screen"><div class="screen-content">
      ${SwimPayBrand()}
      ${PageHeader({
        title: 'Revue des signaux',
        eyebrow: 'Operateur',
        subtitle: 'Verification des signaux de reception pour une revue manuelle V1.'
      })}
      <div class="metrics-grid" style="margin-bottom:26px;">
        ${Object.entries(dashboard.counts_by_status ?? {}).map(([status, count]) => MetricCard({ label: status, value: String(count) })).join('')}
      </div>
      ${Card({ children: `<h3>File d'attente</h3>${dashboard.review_queue?.length ? '<p>Items present</p>' : '<p class="muted">Vide</p>'}` })}
      ${Card({ children: `<h3>Preuves</h3>${evidenceRows.length ? renderEvidenceRows(evidenceRows) : '<p class="muted">Vide</p>'}` })}
      ${StatusPanel({
        title: 'Garde-fous actifs',
        text: 'Les preuves de revue ne sont pas une confiance production. La confirmation marchand reste manuelle en V1. La confiance production exige un double controle.',
        variant: 'info'
      })}
      ${Card({ children: `<h3>Audit</h3>${renderAuditEvents(auditEvents)}` })}
    </div></section>`
  });
}

export function renderEvidenceUnavailablePage(): string {
  return AppShell({
    title: 'Erreur',
    chrome: 'plain',
    children: `<section class="screen merchant-screen"><div class="screen-content mobile-narrow">
      ${SwimPayBrand()}
      ${StatusPanel({
        title: 'Admin indisponible',
        text: 'Verifiez la sante du backend local et la configuration du jeton admin.',
        variant: 'warning'
      })}
    </div></section>`
  });
}

function renderEvidenceRows(rows: BankEvidenceRow[]): string {
  return `<div class="evidence-list">${rows.map((row) => Card({
    children: `<div class="split"><strong>${escapeHtml(row.evidence_id)}</strong><span>${escapeHtml(row.status)}</span></div>
      <p class="muted">${escapeHtml(row.package_name)} - ${escapeHtml(row.cert_sha256_masked)}</p>
      <p class="muted">trusted=${String(row.trusted === true)} - manual_review_only=${String(row.auto_confirm_enabled !== true)}</p>`
  })).join('')}</div>`;
}

function renderAuditEvents(events: AdminAuditEvent[]): string {
  if (events.length === 0) return '<p class="muted">Aucun evenement recent.</p>';
  return `<ul>${events.map((event) => {
    const maskedCert = typeof event.payloadRedacted?.cert_sha256_masked === 'string'
      ? ` - ${escapeHtml(event.payloadRedacted.cert_sha256_masked)}`
      : '';
    return `<li>${escapeHtml(event.eventType)} - ${escapeHtml(event.objectId)}${maskedCert}</li>`;
  }).join('')}</ul>`;
}
