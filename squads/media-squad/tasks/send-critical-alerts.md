---
task: Send Critical Alerts
responsavel: "@media-analyst"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - alert_type
  - severity
  - campaign_data
  - recipients
Saida: |
  - alert_sent
  - channel
  - delivery_status
---

# Send Critical Alerts

Envia alertas críticos

## Implementation

TODO: Implementar lógica da task

## Related

- **Agent:** @media-analyst
