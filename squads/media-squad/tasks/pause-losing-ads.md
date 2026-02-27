---
task: Pause Losing Ads
responsavel: "@media-buyer"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - ad_id
  - reason
  - preserve_data
Saida: |
  - pause_status
  - pause_timestamp
  - data_archived
---

# Pause Losing Ads

Pausa ads losers automaticamente

## Implementation

TODO: Implementar lógica da task

## Related

- **Agent:** @media-buyer
