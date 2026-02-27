---
task: deconstruct-references
responsavel: null
responsavel_type: task_pura
atomic_layer: task
elicit: false
squad: squad-copy
phase: 1-intelligence
Entrada:
  - cataloged_references: "Referencias catalogadas (output de catalog-references)"
Saida:
  - deconstructions: "Hook / Mechanism / Proof / CTA extraidos por referencia"
  - patterns: "Patterns dominantes identificados"
Checklist:
  - "[ ] Receber referencias catalogadas"
  - "[ ] Extrair Hook de cada referencia"
  - "[ ] Extrair Mecanismo de cada referencia"
  - "[ ] Extrair Prova de cada referencia"
  - "[ ] Extrair CTA de cada referencia"
  - "[ ] Consolidar patterns dominantes"
  - "[ ] Entregar para @stefan-georgi suggest-angles"
---

# Deconstruct References — Desconstrucao de Referencias

## Objetivo

Extrair os 4 elementos fundamentais (Hook / Mechanism / Proof / CTA) de cada referencia catalogada. Identificar patterns dominantes.

## Por que task pura?

Processo 100% estruturado. Nao requer julgamento criativo — e autopsia mecanica. Identificar "qual e o hook" e factico, nao opinativo.

## Processo

### 1. Para cada referencia, extrair:

```markdown
### Desconstrucao — Ref {N}

**Hook:** {como comeca, o que prende atencao}
**Tipo de hook:** {curiosidade|medo|resultado|autoridade|controversia|choque}

**Mecanismo:** {como a solucao e apresentada, o "segredo"}
**Tipo de mecanismo:** {ingrediente|metodo|descoberta|tecnologia|historia}

**Prova:** {o que valida a claim}
**Tipo de prova:** {testemunhal|estatistica|expert|antes-depois|estudo}

**CTA:** {como fecha, o que pede}
**Tipo de CTA:** {urgencia|escassez|bonus|garantia|curiosidade}
```

### 2. Consolidar Patterns

Apos desconstruir todas as referencias:

```markdown
## Patterns Dominantes

**Hooks mais frequentes:** {tipos com contagem}
**Mecanismos mais usados:** {tipos com contagem}
**Provas preferidas:** {tipos com contagem}
**CTAs dominantes:** {tipos com contagem}

**Pattern principal:** {combinacao mais frequente}
**Pattern secundario:** {segunda combinacao mais frequente}
```

## Importante

- Desconstruir e EXTRAIR, nao julgar
- Se um elemento nao esta claro, marcar como "implicito" ou "ausente"
- Patterns sao baseados em frequencia, nao preferencia

## Proximo Passo

Desconstrucoes e patterns entregues para `suggest-angles` do @stefan-georgi.
