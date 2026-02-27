---
task: review-vsl
responsavel: "@gary-halbert"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: review

pre-conditions:
  - condition: "VSL script exists"
    source: "User input or generate-vsl-script.output"
    blocker: true
    validation: "Complete VSL script provided for review"

post-conditions:
  - condition: "All 10 questions answered"
    validation: "Each Halbert question has score and feedback"
    blocker: true
  - condition: "Rewrite suggestions for failed items"
    validation: "Specific examples of how to fix each issue"
    blocker: true

Entrada:
  - vsl_script: "Script de VSL existente para revisao"
  - offer_data: "Contexto da oferta (opcional)"
Saida:
  - review_report: "Analise com score por pergunta e sugestoes"
  - rewrite_examples: "Exemplos de reescrita para itens que falharam"
Checklist:
  - "[ ] Avaliar hook (A-pile test)"
  - "[ ] Avaliar historia (conexao emocional)"
  - "[ ] Avaliar agitacao (especificidade visual)"
  - "[ ] Avaliar mecanismo (unico, nomeado, claro)"
  - "[ ] Avaliar fascinations (curiosidade + beneficio)"
  - "[ ] Avaliar Reason Why (credibilidade)"
  - "[ ] Avaliar close (20%+ do script, urgencia real)"
  - "[ ] Avaliar linguagem (nivel 5a-6a serie)"
  - "[ ] Avaliar greased slide (zero friccao)"
  - "[ ] Avaliar bucket brigades (ritmo)"
  - "[ ] Gerar sugestoes de melhoria por bloco"
---

# Review VSL — Revisao com Checklist Halbert (10 Perguntas Criticas)

## Objetivo

Analisar VSL existente usando as 10 perguntas criticas de Gary Halbert e fornecer plano de otimizacao com exemplos de reescrita.

## As 10 Perguntas de Halbert

| # | Pergunta | Peso |
|---|----------|------|
| 1 | O hook sobrevive ao teste A-pile vs B-pile? (Impossivel de ignorar?) | Eliminatorio |
| 2 | A historia e pessoal, vulneravel e cria conexao emocional? | Alto |
| 3 | A agitacao da dor e especifica e VISUAL? | Alto |
| 4 | O mecanismo e unico, nomeado e facil de entender? | Eliminatorio |
| 5 | As fascinations criam curiosidade e prometem beneficio? | Alto |
| 6 | A razao para a oferta (Reason Why) e crivel? | Alto |
| 7 | O fechamento ocupa pelo menos 20% do script e tem urgencia real? | Alto |
| 8 | A linguagem esta no nivel de 5a-6a serie? | Eliminatorio |
| 9 | O fluxo e um greased slide (zero friccao)? | Eliminatorio |
| 10 | Existem bucket brigades para manter o ritmo? | Alto |

## Processo

### Para cada pergunta:

1. **Score**: PASS / NEEDS WORK / FAIL
2. **Evidencia**: Trecho especifico do script que justifica o score
3. **Diagnostico**: O que exatamente esta errado (se aplicavel)
4. **Sugestao**: Como corrigir com exemplo concreto de reescrita

## Output Format

```markdown
# VSL Review Report

## Score Geral: [X/10] — [APPROVED | NEEDS WORK | REWRITE]

### Pergunta 1: Hook (A-pile Test)
**Score:** PASS | NEEDS WORK | FAIL
**Evidencia:** "[trecho do hook atual]"
**Diagnostico:** "..."
**Reescrita sugerida:** "[exemplo concreto]"

### Pergunta 2: Historia
...

## Resumo de Acoes
1. [Acao prioritaria]
2. [Acao secundaria]
...
```

## Verdicts

| Score | Verdict | Acao |
|-------|---------|------|
| 8-10 | APPROVED | Pronto pra producao |
| 5-7 | NEEDS WORK | Corrigir itens identificados |
| 0-4 | REWRITE | Reescrever do zero com novo outline |
