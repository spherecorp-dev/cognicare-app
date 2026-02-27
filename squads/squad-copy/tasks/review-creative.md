---
task: review-creative
responsavel: "@copy-chief"
responsavel_type: agent
atomic_layer: task
elicit: false
squad: squad-copy
phase: 4-review
Entrada:
  - scripts: "Scripts gerados pelo @stefan-georgi"
  - offer_context: "Contexto da oferta (tipo, funil, historico, geo, compliance)"
  - platforms: "Plataformas target"
Saida:
  - verdict: "APPROVED | REVISION_NEEDED | REJECTED"
  - feedback: "Feedback detalhado por script"
Checklist:
  - "[ ] Receber scripts do @stefan-georgi"
  - "[ ] Avaliar criterios eliminatorios"
  - "[ ] Avaliar criterios de qualidade"
  - "[ ] Considerar contexto da oferta (geo e compliance vem da oferta)"
  - "[ ] Emitir veredicto por script"
  - "[ ] Se REVISION_NEEDED: detalhar O QUE mudar"
  - "[ ] Se REJECTED: justificar e avaliar se cabe conversao"
---

# Review Creative — Revisao de Qualidade de Criativos

## Objetivo

Avaliar se criativos gerados "tem cara de winner" baseado em padroes de mercado. Funcionar como primeiro filtro de qualidade antes da producao.

## Por que agente (nao task pura)?

Julgar qualidade criativa requer nuance. Nao e checklist mecanico — e trade-off entre risco e potencial. O @copy-chief interpreta se o criativo VAI FUNCIONAR baseado em experiencia com winners.

## Processo

### 1. Criterios Eliminatorios

Se QUALQUER destes falhar → REJECTED ou REVISION_NEEDED:

- [ ] Hook forte nos primeiros 3 segundos?
- [ ] CTA presente, clara e urgente?
- [ ] Sem violacao de compliance? (verificar compliance/rules.md DA OFERTA — contem regras por geo e por plataforma)

### 2. Criterios de Qualidade

Avaliar em escala (forte / ok / fraco):

| Criterio | Avaliacao |
|----------|----------|
| Hook (impacto, curiosidade) | |
| Mecanismo (credibilidade pro geo) | |
| Tom (alinhado com oferta) | |
| Prova (convincente) | |
| CTA (especifica, urgente) | |
| Estrutura (fluxo logico) | |
| Diferenciacao (vs variacoes anteriores) | |

### 3. Veredictos

**APPROVED:**
- Criativo dentro dos padroes, pode ir pra producao
- Proximo passo: Fase 5 (Delivery)

**REVISION_NEEDED:**
- Tem potencial mas precisa de ajustes
- OBRIGATORIO: detalhar O QUE mudar (sem reescrever)
- Proximo passo: `request-revision` → @stefan-georgi corrige → re-review
- Max 2 rodadas de revisao

**REJECTED:**
- Completamente fora do escopo ou sem potencial
- Avaliar se cabe conversao para REVISION_NEEDED
- Se completamente fora: descartar

### 4. Formato de Feedback

```markdown
### Review — Variacao {N}: {nome}

**Veredicto:** {APPROVED | REVISION_NEEDED | REJECTED}

**Criterios:**
- Hook: {forte|ok|fraco} — {comentario}
- Mecanismo: {forte|ok|fraco} — {comentario}
- Tom: {forte|ok|fraco} — {comentario}
- Prova: {forte|ok|fraco} — {comentario}
- CTA: {forte|ok|fraco} — {comentario}

**Feedback:**
{O que funciona e o que precisa mudar}

**Instrucoes de revisao (se REVISION_NEEDED):**
1. {mudanca especifica 1}
2. {mudanca especifica 2}
```

## Loop de Revisao

```
review → REVISION_NEEDED → request-revision → @stefan-georgi corrige → re-review
Max 2 rodadas. Se ainda REVISION_NEEDED apos 2x → REJECTED.
```

## Importante

- Julgar com base em PADROES, nao gosto pessoal
- Copy Chief humano pode fazer double-check apos o agente
- Agente e primeiro filtro (pega 80% dos problemas), nao substituto
- Instruir O QUE mudar, nunca reescrever
