import { AppShell, Card, MetricCard, PageHeader, StatusPanel, SwimPayBrand, escapeHtml } from '../ui/Components.js';
import type { AdminIntelligenceFeedbackResponse, AdminIntelligenceUnknownShapesResponse, IntelligenceFeedbackRow, IntelligenceUnknownShapeRow } from '../index.js';

export function renderIntelligenceReviewPage(
  feedbackResponse: AdminIntelligenceFeedbackResponse,
  unknownShapesResponse: AdminIntelligenceUnknownShapesResponse
): string {
  const feedback = feedbackResponse.feedback ?? [];
  const unknownShapes = unknownShapesResponse.unknown_shapes ?? [];

  return AppShell({
    title: 'Observations SwimPay',
    chrome: 'plain',
    children: `<section class="screen merchant-screen"><div class="screen-content">
      ${SwimPayBrand()}
      ${PageHeader({
        title: 'Observations SwimPay',
        eyebrow: 'Opérateur',
        subtitle: 'Surveillez les retours et formes inconnues sans modifier les règles opérationnelles.'
      })}
      <div class="metrics-grid" style="margin-bottom:26px;">
        ${MetricCard({ label: 'Feedback', value: String(feedback.length) })}
        ${MetricCard({ label: 'Formes inconnues', value: String(unknownShapes.length) })}
        ${MetricCard({ label: 'Lecture seule', value: feedbackResponse.read_only === true && unknownShapesResponse.read_only === true ? 'Oui' : 'Non' })}
        ${MetricCard({ label: 'Promotion profil', value: feedbackResponse.promotes_profile === true || unknownShapesResponse.promotes_profile === true ? 'Oui' : 'Non' })}
      </div>
      ${StatusPanel({
        title: 'Lecture seule',
        text: 'Ne modifie pas les règles. Ne promeut aucun profil et ne crée aucune validation de paiement.',
        variant: 'info'
      })}
      ${Card({ children: `<h3>Retours opérateur</h3>${feedback.length ? renderFeedbackRows(feedback) : '<p class="muted">Vide</p>'}` })}
      ${Card({ children: `<h3>Formes inconnues</h3>${unknownShapes.length ? renderUnknownShapeRows(unknownShapes) : '<p class="muted">Vide</p>'}` })}
    </div></section>`
  });
}

export function renderIntelligenceUnavailablePage(): string {
  return AppShell({
    title: 'Observations indisponibles',
    chrome: 'plain',
    children: `<section class="screen merchant-screen"><div class="screen-content mobile-narrow">
      ${SwimPayBrand()}
      ${StatusPanel({
        title: 'Observations indisponibles',
        text: 'Vérifiez la santé du backend local et la configuration du jeton admin.',
        variant: 'warning'
      })}
    </div></section>`
  });
}

function renderFeedbackRows(rows: IntelligenceFeedbackRow[]): string {
  return `<div class="evidence-list">${rows.map((row) => Card({
    children: `<div class="split"><strong>${escapeHtml(row.feedback_id)}</strong><span>${escapeHtml(row.review_status)}</span></div>
      <p class="muted">${escapeHtml(row.bank_profile_id)} - ${escapeHtml(row.package_name)}</p>
      <p class="muted">${escapeHtml(row.shape_hash)} - ${escapeHtml(row.classification_guess)} -> ${escapeHtml(row.human_label)}</p>
      <p class="muted">${escapeHtml(row.learning_metadata?.learning_context)} - ${escapeHtml(row.learning_metadata?.intent_relation)}</p>
      <p class="muted">mutates_runtime_rules=${String(row.mutates_runtime_rules === true)} - promotes_profile=${String(row.promotes_profile === true)}</p>`
  })).join('')}</div>`;
}

function renderUnknownShapeRows(rows: IntelligenceUnknownShapeRow[]): string {
  return `<div class="evidence-list">${rows.map((row) => Card({
    children: `<div class="split"><strong>${escapeHtml(row.shape_hash)}</strong><span>${escapeHtml(row.review_status)}</span></div>
      <p class="muted">${escapeHtml(row.bank_profile_id)} - ${escapeHtml(row.package_name)}</p>
      <p class="muted">${escapeHtml(row.learning_context)} - ${escapeHtml(row.classification_guess)} - vues ${String(row.seen_count ?? 0)}</p>
      <p class="muted">mutates_runtime_rules=${String(row.mutates_runtime_rules === true)} - promotes_profile=${String(row.promotes_profile === true)}</p>`
  })).join('')}</div>`;
}
