---
task: Configure RedTrack Postback
responsavel: "@media-engineer"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - campaign_id_redtrack
  - platform
  - conversion_events
Saida: |
  - postback_urls
  - postback_verified
  - test_conversion_sent
---

# Configure RedTrack Postback

Configura postbacks RedTrack para Meta

## Implementation

TODO: Implementar lógica da task

## Related

- **Agent:** @media-engineer
