---
task: suggest-angles
responsavel: "@stefan-georgi"
responsavel_type: agent
atomic_layer: task
elicit: false
squad: squad-copy
phase: 2-strategy

pre-conditions:
  - condition: "References cataloged and deconstructed"
    source: "deconstruct-references.output.patterns"
    blocker: true
    validation: "patterns object exists with Hook/Mechanism/Proof/CTA"
  - condition: "Offer data interpreted"
    source: "interpret-offer-data.output.analysis"
    blocker: true
    validation: "offer_context loaded with geo, compliance, Big Idea"
  - condition: "Winners library available (optional)"
    source: "fetch-offer-data.output.performance OR data/winners-library.md"
    blocker: false
    validation: "Historical winners data for reference"

post-conditions:
  - condition: "At least 3 angles suggested"
    validation: "angles array has minimum 3 entries"
    blocker: true
  - condition: "Each angle has confidence score"
    validation: "confidence: alta|media|baixa for each angle"
    blocker: true
  - condition: "Each angle has evidence-based rationale"
    validation: "reasoning references specific pattern/winner"
    blocker: true
  - condition: "Angles adapted to offer geo"
    validation: "Cultural adaptation considered for target geo"
    blocker: false

Entrada:
  - patterns: "Patterns extraidos da desconstrucao de referencias"
  - winners: "Winners historicos da oferta (ou similares)"
  - offer_data: "Dados da oferta interpretados pelo @copy-chief (inclui geo, compliance)"
Saida:
  - angles: "Lista de angulos rankeados por confianca"
  - reasoning: "Justificativa de cada angulo (baseado em que pattern/winner)"
Checklist:
  - "[ ] Receber patterns das referencias desconstruidas"
  - "[ ] Cruzar com winners historicos da oferta"
  - "[ ] Considerar interpretacao de dados do @copy-chief"
  - "[ ] Gerar angulos adaptados ao geo da oferta (offer_data.geos)"
  - "[ ] Rankear por confianca (baseado em evidencia)"
  - "[ ] Entregar lista para Copy humano decidir quais usar"
---

# Suggest Angles — Sugestao de Angulos Criativos (Georgi Method)

## Objetivo

Sugerir angulos criativos com o **Mecanismo Unico (UMP)** como eixo central, cruzando com patterns de referencias desconstruidas, winners historicos e dados de performance. Copy humano decide quais usar.

## Contexto

Este e o ponto onde dados se transformam em direcao criativa. No metodo RMBC de Georgi, os angulos nascem do MECANISMO — cada angulo e uma perspectiva diferente sobre o mesmo mecanismo unico da oferta. O agente SUGERE, o humano DECIDE. Cada angulo deve ter justificativa baseada em evidencia (nao inventar do nada).

## Principio Central: UMP como Eixo

> O Mecanismo Unico do Problema (UMP) e a lente atraves da qual TODOS os angulos sao avaliados.
> Recebido do @copy-chief via `interpret-offer-data` output (Big Idea, UMP).
> Se o UMP nao foi recebido, PEDIR antes de gerar angulos.

Cada angulo e uma **perspectiva diferente sobre o mecanismo**:
- **Angulo pela causa:** Foco na causa do problema (o mecanismo como vilao)
- **Angulo pela solucao:** Foco na descoberta (o mecanismo como heroi)
- **Angulo pela consequencia:** Foco no que acontece se nao agir (urgencia)
- **Angulo pela invalidacao:** Foco em por que nada funcionou antes (reframe)
- **Angulo pela prova:** Foco em quem ja resolveu (social proof + mecanismo)

## Processo

### 1. Coletar e Analisar Inputs

- **UMP da oferta** (de `interpret-offer-data.output`) — **INPUT PRIMARIO, NAO OPCIONAL**
- Patterns da task `deconstruct-references` (Hook/Mechanism/Proof/CTA dominantes)
- Winners historicos (da biblioteca ou dados do @copy-chief)
- Dados de performance interpretados
- Creative profile da oferta (blackhat-dr, low-ticket, saas-demo, whitehat-brand)
- Swipe file do expert (data/swipe-files/stefan-georgi.md) — para modelagem de hooks

### 2. Gerar Angulos (UMP como Eixo)

Para cada angulo, PRIMEIRO definir a perspectiva sobre o mecanismo, DEPOIS construir o resto:

```markdown
### Angulo {N}: {nome_descritivo}

**Perspectiva do UMP:** {causa|solucao|consequencia|invalidacao|prova}
**Confianca:** {alta|media|baixa}
**Baseado em:** {referencia/winner/pattern que justifica}
**Hook sugerido:** {exemplo de hook pra esse angulo}
**Hook type:** {pattern_interrupt|curiosity_gap|controversy|forbidden_knowledge|relatability|social_proof_shock}
**Tom recomendado:** {medo|curiosidade|autoridade|urgencia|emocao}
**Emocao-alvo:** {a resposta interna que o ad deve provocar — Trust→Love→Profit}
**Formatos ideais:** {VSL|UGC|imagem|etc}
**Fascinations sugeridas:** {2-3 bullets de curiosidade que funcionam com esse angulo}
**Geo notes:** {adaptacoes especificas pro geo}
```

### 3. Rankear por Confianca

- **Alta:** Angulo baseado em winner comprovado ou pattern dominante (3+ referencias) + mecanismo alinhado ao UMP
- **Media:** Angulo baseado em pattern emergente ou winner de oferta similar + mecanismo compativel
- **Baixa:** Angulo exploratorio, sem evidencia forte (do-zero territory) — mas AINDA conectado ao UMP

### 4. Quantidade e Mix

- **Minimo:** 5 angulos
- **Ideal:** 8-12 angulos
- **Mix de confianca:** 60% alta, 30% media, 10% baixa (exploratorio)
- **Mix de perspectiva UMP:** Pelo menos 1 angulo de cada perspectiva (causa, solucao, consequencia, invalidacao, prova)
- **Mix de hook type:** Variar entre pelo menos 3 tipos diferentes de hook

## Output

Lista de angulos entregue ao Copy humano para selecao. Copy escolhe quais usar e define o metodo de producao (modelagem / variacao / do-zero).

## Importante

- Angulos sao SUGESTOES, nao ordens
- **TODO angulo deve se conectar ao UMP** — angulo sem mecanismo e angulo fraco
- Sempre justificar com evidencia
- Nao inventar dados ou patterns que nao existem
- Hooks sugeridos devem seguir os tipos catalogados (ver agent stefan-georgi.md → hooks.types)
- Fascinations sugeridas devem seguir os formatos da fascination-library.md
- Respeitar o feeling do Copy humano — ele conhece o mercado

### Output JSON Schema (OBRIGATORIO)

CRITICO: Sua resposta DEVE ser um unico objeto JSON valido. NAO use markdown. NAO adicione texto fora do JSON.

```json
{
  "angles": [
    {
      "id": 1,
      "name": "Nome descritivo do angulo",
      "type": "causa|solucao|consequencia|invalidacao|prova",
      "hook": "Exemplo de hook sugerido para esse angulo",
      "hook_type": "pattern_interrupt|curiosity_gap|controversy|forbidden_knowledge|relatability|social_proof_shock",
      "mechanism": "Como o angulo se conecta ao UMP",
      "proof": "Evidencia que suporta esse angulo (winner/pattern/referencia)",
      "confidence": "alta|media|baixa",
      "recommended_format": "VSL|UGC|imagem|carrossel|podcast",
      "reference_source": "spy-ref-XX ou winner-XX que justifica",
      "tone": "medo|curiosidade|autoridade|urgencia|emocao",
      "target_emotion": "Resposta interna que o ad deve provocar",
      "fascinations": ["bullet de curiosidade 1", "bullet de curiosidade 2"],
      "geo_notes": "Adaptacoes especificas pro geo"
    }
  ],
  "total_angles": 8,
  "methodology_used": "RMBC Georgi Method — UMP como eixo central",
  "confidence_distribution": {
    "alta": 5,
    "media": 2,
    "baixa": 1
  }
}
```
