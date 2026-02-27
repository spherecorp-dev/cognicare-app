---
task: Analyze Campaign Context
responsavel: "@media-head"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - offer_id: ID da oferta
  - creative_ids: Lista de IDs de criativos
  - human_instruction: Instrução humana (opcional)
Saida: |
  - context_analysis: Análise completa do contexto
  - creative_profile: Perfil do criativo (blackhat-dr, whitehat, saas)
  - target_cpa: CPA alvo
  - historical_patterns: Padrões históricos identificados
---

# Analyze Campaign Context

Analisa contexto completo da oferta e histórico para embasar decisões estratégicas do media-head.

## Processo

1. Buscar dados da oferta em `/offers/{offer_id}/offer.yaml`
2. Ler creative_profile, product_url, target_cpa
3. Carregar criativos especificados
4. Consultar decision_log.json para padrões históricos dessa oferta
5. Gerar análise consolidada

## Output

Contexto completo incluindo:
- Dados da oferta
- Perfil criativo
- Histórico de decisões similares
- Recomendações baseadas em padrões
