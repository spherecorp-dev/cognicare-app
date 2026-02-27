---
task: request-revision
responsavel: "@copy-chief"
responsavel_type: agent
atomic_layer: task
elicit: false
squad: squad-copy
phase: 4-review
Entrada:
  - creative: "Criativo com veredicto REVISION_NEEDED"
  - review_feedback: "Feedback do review-creative"
Saida:
  - revision_instructions: "Instrucoes especificas do que mudar (sem reescrever)"
  - priority: "Ordem de prioridade das mudancas"
Checklist:
  - "[ ] Receber criativo e feedback do review"
  - "[ ] Identificar problemas especificos"
  - "[ ] Detalhar O QUE mudar (nao COMO)"
  - "[ ] Priorizar mudancas por impacto"
  - "[ ] Enviar instrucoes pro @stefan-georgi"
---

# Request Revision — Instrucoes de Revisao

## Objetivo

Transformar feedback do review em instrucoes claras e acionaveis para o @stefan-georgi corrigir. O Copy Chief diz O QUE mudar, nao reescreve.

## Processo

### 1. Analisar Feedback

A partir do veredicto REVISION_NEEDED do `review-creative`, identificar:
- Quais criterios falharam (hook, mecanismo, tom, prova, CTA)
- Severidade de cada problema
- Se sao problemas independentes ou conectados

### 2. Gerar Instrucoes

Para cada problema:

```markdown
### Revisao {N}: {area_do_problema}

**Problema:** {descricao clara do que esta errado}
**Impacto:** {por que isso impede o criativo de funcionar}
**Instrucao:** {o que mudar — sem reescrever}
**Exemplo de direcao:** {indicacao de tom/abordagem, nao texto pronto}
**Prioridade:** {alta|media}
```

### 3. Regras

- **Instruir, nao reescrever** — respeitar autonomia do @stefan-georgi
- **Ser especifico** — "hook fraco" nao e instrucao. "Hook nao gera curiosidade suficiente pro publico FR" e instrucao.
- **Priorizar** — se ha 5 problemas, indicar quais 2 sao criticos
- **Max 2 rodadas** — se apos 2 revisoes ainda nao funciona, escalar para REJECTED

## Fluxo

```
review-creative (REVISION_NEEDED)
  → request-revision (instrucoes)
    → @stefan-georgi corrige
      → review-creative (re-review)
        → APPROVED | REVISION_NEEDED (rodada 2) | REJECTED
```

## Importante

- Esta e a rodada {1|2} de max 2
- Se rodada 2 e veredicto continua REVISION_NEEDED → converter para REJECTED
- Copy Chief humano pode intervir a qualquer momento
