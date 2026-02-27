---
task: adapt-vsl-to-geo
responsavel: "@gary-halbert"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: production

pre-conditions:
  - condition: "Source VSL script exists"
    source: "generate-vsl-script.output or user input"
    blocker: true
    validation: "Complete VSL script in source geo"
  - condition: "Target geo defined"
    source: "User input"
    blocker: true
    validation: "Target geo with compliance rules available"

post-conditions:
  - condition: "Script adapted (not translated)"
    validation: "Tone, rhythm, proof types adapted to target geo"
    blocker: true
  - condition: "Compliance of target geo verified"
    validation: "All claims pass target geo compliance"
    blocker: true

Entrada:
  - source_script: "VSL script original"
  - source_geo: "Geo de origem (fr/es/en)"
  - target_geo: "Geo alvo"
  - offer_data: "Dados da oferta"
Saida:
  - adapted_script: "VSL adaptado para o geo alvo"
Checklist:
  - "[ ] Analisar tom e estilo do script original"
  - "[ ] Aplicar regras de adaptacao do geo alvo"
  - "[ ] Ajustar RITMO (FR=+20%, EN=-10%)"
  - "[ ] Reordenar provas por preferencia do geo"
  - "[ ] Verificar compliance do geo alvo"
  - "[ ] Rodar self-review"
---

# Adapt VSL to Geo — Adaptacao Cross-Geo (Halbert Method)

## Objetivo

Adaptar VSL para outro geo. RECONSTRUIR, nao traduzir. Cada geo tem seu estilo de persuasao, ritmo, preferencia de provas e limites de compliance.

## Regra de Ouro

**Adaptacao cultural = NUNCA traducao literal.**
Desconstruir a argumentacao e RECONSTRUIR no estilo do geo alvo.

## Adaptacoes por Geo

### FR (Frances)
- **Tom**: Formal-elegante. Jornalistico/cientifico.
- **Ritmo**: +20% de duracao (mais detalhamento, menos pressa)
- **Provas**: Estudos > Expert > Testimonials
- **Hooks**: Logica e descoberta > hype e urgencia
- **Evitar**: Hype americano, urgencia falsa, caps excessivo

### ES (Espanhol)
- **Tom**: Caloroso, pessoal, intimo, comunitario
- **Ritmo**: Padrao
- **Provas**: Testimonials > Historia pessoal > Dados
- **Hooks**: Historias de transformacao > dados frios
- **Evitar**: Tom frio, excesso de dados, linguagem impessoal

### EN (Ingles)
- **Tom**: Direto, urgente, BOLD. Estilo nativo Halbert.
- **Ritmo**: -10% (mais conciso)
- **Provas**: Dados > Testimonials > Expert
- **Hooks**: Numeros, resultados rapidos, urgencia
- **Evitar**: Rodeios, voz passiva, falta de especificidade

## Processo

1. **Desconstruir** o script original em blocos (hook, story, mechanism, proof, offer, close)
2. **Mapear** cada bloco para o estilo do geo alvo
3. **Reescrever** cada bloco no tom e ritmo do geo
4. **Reordenar** provas conforme preferencia do geo
5. **Verificar** compliance do geo alvo
6. **Ajustar** duracao conforme regra do geo
