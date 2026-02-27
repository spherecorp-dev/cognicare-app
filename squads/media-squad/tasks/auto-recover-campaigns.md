---
task: Auto Recover Campaigns
responsavel: "@media-analyst"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - issue_type
  - campaign_id
  - recovery_strategy
Saida: |
  - recovery_status
  - actions_taken
  - manual_intervention_needed
---

# Auto Recover Campaigns

Recuperação automática de campanhas com problemas

## Implementation

TODO: Implementar lógica da task

## Related

- **Agent:** @media-analyst
