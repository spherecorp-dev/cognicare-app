---
task: build-video-brief
responsavel: null
responsavel_type: task_pura
atomic_layer: task
elicit: false
squad: squad-copy
phase: 5-delivery
Entrada:
  - script: "Script aprovado pelo @copy-chief"
  - estilo_edicao: "UGC, cinematografica, podcast, breaking news, AI avatar, etc"
  - persona: "Persona e aparencia dos avatares/presenters"
Saida:
  - brief: "Brief simples pro editor"
  - visual_direction: "Tom visual, copy na tela, CTA final"
Checklist:
  - "[ ] Receber script aprovado"
  - "[ ] Definir tipo de edicao"
  - "[ ] Definir persona/avatar"
  - "[ ] Montar brief com direcao visual"
  - "[ ] Incluir copy na tela e CTA final"
  - "[ ] Entregar para editor humano"
---

# Build Video Brief — Brief de Edicao para Editor

## Objetivo

Montar brief simples e claro pro editor humano produzir o video. NAO e scene-by-scene com timecodes detalhados — editor tem liberdade criativa na execucao.

## Por que task pura?

Segue template. Preenche campos estruturados a partir de inputs definidos. Sem julgamento.

## O que o brief define

- Tipo de edicao (UGC, cinematografica, podcast, breaking news, AI avatar, etc)
- Persona e aparencia dos avatares
- Tom visual geral
- Copy na tela (texto overlay)
- CTA final

## O que o brief NAO define

- Timecodes exatos
- Transicoes especificas
- Cortes frame a frame
- Musica/SFX especificos (editor escolhe)

## Formato de Saida

```markdown
## Brief de Video — {nome_do_script}

**Tipo de edicao:** {estilo}
**Duracao alvo:** {segundos}
**Geo:** {fr|es|en}

### Persona
- Aparencia: {descricao}
- Tom de voz: {descricao}
- Idade aparente: {faixa}

### Direcao Visual
- Tom: {descricao do mood}
- Cores dominantes: {paleta}
- Ritmo: {rapido|medio|lento}

### Copy na Tela
- Hook visual: {texto}
- Pontos-chave: {lista}
- CTA final: {texto}

### Script
{script_completo}

### Notas pro Editor
- {nota_1}
- {nota_2}
```

## Importante

- Brief deve caber em 1 pagina
- Editor tem LIBERDADE criativa na execucao
- Se algo nao e especificado, editor decide
- Handoff via Notion
