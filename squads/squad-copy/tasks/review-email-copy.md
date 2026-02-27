---
task: review-email-copy
responsavel: "@ben-settle"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: review

pre-conditions:
  - condition: "Email copy exists"
    source: "User input"
    blocker: true
    validation: "Complete email(s) provided for review"

post-conditions:
  - condition: "All 10 checks answered"
    validation: "Each check has score and feedback"
    blocker: true
  - condition: "Rewrite suggestions for failed items"
    validation: "Specific examples of how to fix each issue"
    blocker: true

Entrada:
  - email_copy: "Email(s) existente(s) para revisao"
  - vertical: "nutra | infoproduto | saas (opcional)"
  - context: "Contexto da oferta (opcional)"
Saida:
  - review_report: "Analise com score por check e sugestoes"
  - rewrite_examples: "Exemplos de reescrita para items que falharam"
Checklist:
  - "[ ] Avaliar se vende algo (direta ou indiretamente)"
  - "[ ] Avaliar subject line (curiosidade sem revelar)"
  - "[ ] Avaliar infotainment (entretem + informa)"
  - "[ ] Avaliar standalone (funciona sozinho)"
  - "[ ] Avaliar tom (pessoa real, nao empresa)"
  - "[ ] Avaliar CTA (presente e claro)"
  - "[ ] Avaliar tamanho (200-400 palavras)"
  - "[ ] Avaliar formato (plain text)"
  - "[ ] Avaliar personalidade (adaptada ao publico)"
  - "[ ] Verificar compliance"
  - "[ ] Gerar sugestoes de melhoria"
---

# Review Email Copy — Revisao com 10 Checks do Email Player (Ben Settle Method)

## Objetivo

Analisar email(s) existente(s) usando os 10 checks do Email Player e fornecer plano de otimizacao com exemplos de reescrita.

## Os 10 Checks do Email Player

| # | Check | Severidade |
|---|-------|-----------|
| 1 | O email vende algo (direta ou indiretamente)? | Eliminatorio |
| 2 | A subject line cria curiosidade sem revelar o conteudo? | Eliminatorio |
| 3 | O email entretem E informa (infotainment)? | Eliminatorio |
| 4 | O email funciona standalone (sem depender de anteriores)? | Alto |
| 5 | O tom soa como pessoa real, nao empresa? | Eliminatorio |
| 6 | O email tem CTA claro? | Eliminatorio |
| 7 | O email tem 200-400 palavras (conciso)? | Alto |
| 8 | O formato e plain text (sem graficos/HTML)? | Alto |
| 9 | A personalidade esta adaptada ao publico do nicho? | Alto |
| 10 | Compliance verificado (CAN-SPAM, claims, disclaimers)? | Eliminatorio |

## Processo

### Para cada check:

1. **Score**: PASS / NEEDS WORK / FAIL
2. **Evidencia**: Trecho especifico do email que justifica o score
3. **Diagnostico**: O que exatamente esta errado (se aplicavel)
4. **Sugestao**: Como corrigir com exemplo concreto de reescrita

## Output Format

```markdown
# Email Review Report

## Score Geral: [X/10] — [APPROVED | NEEDS WORK | REWRITE]

### Check 1: Sell in Every Email
**Score:** PASS | NEEDS WORK | FAIL
**Evidencia:** "[trecho relevante]"
**Diagnostico:** "..."
**Reescrita sugerida:** "[exemplo concreto]"

### Check 2: Subject Line
...

## Tipo de Email Identificado
[Qual dos 7 tipos mais se aproxima]

## Sugestoes Adicionais
- [Sugestao de melhoria do tipo de email]
- [Oportunidade de infotainment]
- [Personalidade que pode ser amplificada]

## Resumo de Acoes
1. [Acao prioritaria]
2. [Acao secundaria]
...
```

## Verdicts

| Score | Verdict | Acao |
|-------|---------|------|
| 8-10 | APPROVED | Pronto pra envio |
| 5-7 | NEEDS WORK | Corrigir itens identificados |
| 0-4 | REWRITE | Reescrever do zero com principios Settle |

## Analise Adicional

Alem dos 10 checks, avaliar:

- **Qual dos 7 tipos** o email mais se aproxima?
- **Pode ser melhorado** mudando o tipo?
- **A opening** soa como meio de conversa ou inicio formal?
- **O CTA** soa natural ou forcado?
- **Existe oportunidade** de soft teaching?
- **A subject line** poderia ser reciclada de uma que ja funcionou?
