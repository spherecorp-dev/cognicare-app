---
task: generate-scripts
responsavel: "@stefan-georgi"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: 3-production
Entrada:
  - angulos: "Angulos selecionados pelo Copy humano"
  - oferta: "Detalhes da oferta (produto, preco, beneficio principal, geo, compliance)"
  - formato: "Tipo de criativo (VSL, UGC, imagem, carrossel, podcast, AI avatar, etc)"
  - metodo: "Modelagem (referencia) | Do-zero (livre)"
Saida:
  - scripts: "5-10 variacoes de script por angulo"
  - metadata: "Formato, variavel testada em cada script"
Checklist:
  - "[ ] Receber angulos selecionados pelo Copy"
  - "[ ] Confirmar formato e numero de variacoes (elicit). Geo vem da oferta."
  - "[ ] Identificar metodo: modelagem (basear em referencia) ou do-zero"
  - "[ ] Gerar variacoes seguindo estrutura Hook → Problema → Mecanismo → Prova → CTA"
  - "[ ] Adaptar tom e referencias culturais para o geo da oferta"
  - "[ ] Garantir que cada variacao testa APENAS UMA variavel"
  - "[ ] Marcar qual variavel foi alterada em cada script"
  - "[ ] Entregar scripts para review do @copy-chief"
---

# Generate Scripts — Geracao de Variacoes de Script

## Objetivo

Gerar 5-10 variacoes de script por angulo selecionado. Cada variacao testa UMA variavel para permitir aprendizado iterativo nas campanhas.

## Contexto

Este e o core da producao criativa. O Copy humano ja selecionou angulos e metodo. O agente executa a geracao com julgamento criativo sobre tom, estilo e adaptacao cultural.

## Processo

### 1. Receber Inputs (Elicit se necessario)

Perguntar ao usuario:
- Qual formato? (VSL, UGC, imagem, carrossel, podcast, AI avatar, breaking news, cinematografico)
- Quantas variacoes por angulo? (padrao: 5-10)
- Metodo? (modelagem = basear em referencia | do-zero = livre)

> **Geo e compliance vem da oferta** (offer.yaml → geos, compliance/rules.md). Nao perguntar separadamente.

### 2. Estrutura Obrigatoria

```
HOOK (3-5 segundos / 1 frase)
  ↓
PROBLEMA (agravamento da dor)
  ↓
MECANISMO (o "como" unico da solucao)
  ↓
PROVA (social proof, dados, resultado)
  ↓
CTA (call to action claro e especifico)
```

### 3. Metodo de Producao

**Modelagem (80% dos casos):**
- Basear na referencia/winner
- Manter estrutura que funciona
- Variar hook, tom ou formato

**Do-zero (5% dos casos):**
- Mais liberdade criativa
- Explorar angulos nao testados
- Manter estrutura obrigatoria

### 4. Adaptacao Cultural por Geo

> Geo da oferta vem do `offer.yaml` (campo `geos`). Usar creative-direction.md para tom por geo.

**FR:** Formal, elegante, argumentacao logica. Evitar hype americano.
**ES:** Caloroso, emocional, familia e comunidade. Storytelling.
**EN:** Direto, urgente, numeros e resultados. Bold.

### 5. Variaveis a Testar (uma por script)

- **hook_type:** curiosidade vs dor vs resultado vs autoridade vs controversia
- **tone:** formal vs casual vs urgente vs educacional
- **length:** curto (15s) vs medio (30s) vs longo (60s+)
- **proof_type:** testemunhal vs estatistica vs expert vs antes/depois
- **problem_depth:** superficial vs profundo
- **mechanism_focus:** beneficio vs "como funciona" vs diferencial

### 6. Formato de Entrega

```markdown
### Variacao {N} — {nome_descritivo}
**Variavel testada:** {variavel alterada}
**Formato:** {VSL/UGC/etc}
**Geo:** {geo da oferta}
**Duracao estimada:** {segundos}

---

[SCRIPT COMPLETO]

---

**Notas de producao:**
- [Instrucoes especificas para editor/creator]
```

### 7. Quantidade

- **Minimo:** 5 variacoes por angulo
- **Ideal:** 7-10 variacoes por angulo
- Cada variacao deve ser substantivamente diferente (nao apenas trocar sinonimos)

## Validacao Pre-Entrega

- [ ] Estrutura Hook → Problema → Mecanismo → Prova → CTA respeitada
- [ ] Cada variacao altera APENAS uma variavel
- [ ] Tom e referencias culturais adequados ao geo da oferta
- [ ] CTA claro e especifico em cada script
- [ ] Formato compativel com canal de distribuicao

## Proximo Passo

Scripts vao para `review-creative` do @copy-chief.
