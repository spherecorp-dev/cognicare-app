---
task: Check Business Manager Health
responsavel: "@media-engineer"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - bm_id
  - platform
Saida: |
  - health_status
  - issues_detected
  - ad_account_limits
---

# Check Business Manager Health

Verifica health do Business Manager

## Implementation

TODO: Implementar lógica da task

## Related

- **Agent:** @media-engineer
