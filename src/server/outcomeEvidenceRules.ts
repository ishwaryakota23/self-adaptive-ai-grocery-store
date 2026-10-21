export function hasVerifiedOutcomeEvidence(outcome: {
  evidence_source?: string;
  observed_event?: string;
  action_taken?: string;
  reobserved_metric?: string;
  outcome_summary?: string;
}): boolean {
  return outcome.evidence_source === 'verified-operation' &&
    [outcome.observed_event, outcome.action_taken, outcome.reobserved_metric, outcome.outcome_summary]
      .every(value => typeof value === 'string' && value.trim().length >= 8);
}
