---
task: Adjust Campaign Bids
responsavel: "@media-buyer"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - campaign_id
  - new_bid_amount
  - bid_strategy
Saida: |
  - adjustment_status
  - previous_bid
  - new_bid
  - effective_timestamp
---

# Adjust Campaign Bids

Ajusta lances de campanha

## Implementation

TODO: Implementar lógica da task

## Related

- **Agent:** @media-buyer
