---
task: Reallocate Campaign Budget
responsavel: "@media-buyer"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - source_adset
  - target_adset
  - amount
Saida: |
  - reallocation_status
  - new_budgets
  - effective_timestamp
---

# Reallocate Campaign Budget

Realoca budget entre adsets

## Implementation

TODO: Implementar lógica da task

## Related

- **Agent:** @media-buyer
