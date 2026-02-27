---
task: Monitor Anomalies
responsavel: "@media-analyst"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - campaign_ids
  - monitoring_rules
  - alert_thresholds
Saida: |
  - anomalies_detected
  - severity
  - notifications_sent
---

# Monitor Anomalies

Monitoramento 24/7 de anomalias em campanhas

## Implementation

TODO: Implementar lógica da task

## Related

- **Agent:** @media-analyst
