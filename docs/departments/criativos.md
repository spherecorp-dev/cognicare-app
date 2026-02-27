# Squad: Criativos — Documento de Departamento (v2)

> Input para @squad-creator desenhar a squad de criativos.
> v1: Gerado via Advanced Elicitation com @aios-master (Orion) em 2026-02-15
> v2: Atualizado com processo real detalhado em 2026-02-17 (sessao de arquitetura com owner)
> Mudancas v2: Reducao de 5 agentes para 3, adicao de Copy Chief, metodo 80/20,
> path de variacao de winner, fases reais do processo, task-first architecture.

---

## 1. Visao Geral

| Campo | Valor |
|-------|-------|
| **Squad** | Criativos |
| **Departamento** | Marketing |
| **Objetivo** | Producao de criativos para campanhas de Direct Response |
| **Volume** | 10-15 criativos/dia (minimo 50 por oferta na validacao) |
| **Meta** | 20-30+ criativos/dia com automacao |
| **Geos** | Frances (worldwide), Espanhol (worldwide), Ingles (EUA) |
| **Modelo** | Copy humano como curador + pipeline automatizado como executor |
| **Principio arquitetural** | Task-first: tasks definem O QUE, agentes executam ONDE precisa de julgamento |

---

## 2. Equipe Atual

| Funcao | Qtd | Contrato | Responsabilidades |
|--------|-----|----------|-------------------|
| Copywriter | 1 | PJ | Spy, curadoria de angulos, scripts, revisao, todos os geos |
| Editor | 2 | PJ | Edicao de video/imagem, finalizacao |

- **Rotina:** Livre, sem horarios fixos
- **Handoff:** Notion (estruturado, quase elimina comunicacao verbal)
- **Comunicacao:** WhatsApp/Call apenas para excecoes

---

## 3. Processo Real Detalhado (v2)

### Fase 1: Intelligence (Pesquisa e Analise)

```
1.1  Copy escolhe oferta a ser trabalhada
     → Decisao HUMANA (feeling + oportunidade)

1.2  Verifica se oferta ja tem dados, e nova, ou similar a outra
     → TASK PURA (fetch-offer-data): puxa dados brutos (ROAS, CPA, CTR, spend, winners)
     → AGENTE @copy-chief (interpret-offer-data): interpreta os dados com contexto
       Exemplo: "ROAS negativo mas CTR alto — problema pode ser LP, nao criativo"
       Exemplo: "Oferta similar a X que funcionou com hooks de medo no FR"

1.3  Copy faz pesquisa de mercado e concorrencia
     → HUMANO: spy em busca de criativos e ofertas validadas e escaladas
     → Visita: Meta Ads Library, TikTok Creative Center, Reddit, YouTube Shorts,
       YouTube, organico em geral
     → Identifica tipos e formatos de conteudo hypados (mesmo nicho e outros)

1.4  Salva referencias e categoriza
     → HUMANO salva os materiais encontrados
     → TASK PURA (catalog-references): estrutura e categoriza com metadata
       Metadata: formato, tipo de conteudo, mecanismo, nicho, plataforma de origem,
       spend estimado, estilo de edicao
     → NOTA: catalogar NAO e desconstruir. Catalogar = ficha tecnica.
       Desconstruir = autopsia criativa (vem depois).

1.5  Desconstrucao das referencias
     → TASK PURA (deconstruct-references): extrai Hook / Mecanismo / Prova / CTA
       de cada referencia catalogada. Identifica patterns dominantes.
     → Processo 100% estruturado, sem julgamento criativo.
```

### Fase 2: Strategy (Definicao Criativa)

```
2.1  Sugestao de angulos
     → AGENTE @stefan-georgi executa task suggest-angles
       Sugere angulos baseado em: patterns das referencias + winners historicos +
       dados de performance da oferta
     → Output: angulos rankeados por confianca
     → NOTA: e SUGESTAO. Copy humano decide quais usar.

2.2  Copy define: angulos finais, hooks, formatos, tipo de conteudo, tipo de edicao

2.3  Copy escolhe metodo de producao:
     ├── MODELAGEM (80%): trabalha a partir de conteudo validado (nosso ou concorrente)
     │   → Vai pro fluxo completo de geracao de scripts
     │
     ├── VARIACAO DE WINNER (15%): variacao simples de criativo ja existente
     │   → Troca avatar, tipo de edicao, hook — mantem mesma copy
     │   → Pula geracao de scripts, vai direto pra brief de variacao
     │
     └── CRIACAO DO ZERO (5%): inovacao pura, sem referencia
         → Vai pro fluxo completo com mais liberdade criativa
```

### Fase 3: Production (Criacao)

```
3.1  Geracao de scripts
     → AGENTE @stefan-georgi executa task generate-scripts
     → 5-10 variacoes por angulo
     → Cada variacao testa UMA variavel (hook, tom, formato, tamanho)
     → Se method=modelagem: basear em referencia, manter estrutura
     → Se method=do-zero: explorar, mais liberdade
     → Estrutura: Hook → Problema → Mecanismo → Prova → CTA

3.2  Legendas e titulos de ads
     → AGENTE @stefan-georgi executa task generate-ad-copy
     → Headlines, descriptions, captions por plataforma (Meta, TikTok)
```

### Fase 4: Review (Aprovacao)

```
4.1  Copy Chief revisa
     → AGENTE @copy-chief executa task review-creative
     → Avalia se o criativo esta dentro dos padroes que costumam funcionar
       pro tipo de funil/oferta
     → Criterios: hook forte nos primeiros 3s? Mecanismo crivel pro geo?
       Tom combina com oferta? CTA clara e urgente?
     → Veredictos: APPROVED | REVISION_NEEDED | REJECTED

4.2  Se REVISION_NEEDED:
     → @copy-chief detalha O QUE mudar (nao reescreve)
     → @stefan-georgi corrige e resubmete
     → Max 2 rodadas de revisao

4.3  Se REJECTED:
     → Avalia se foi completamente fora do escopo ou se cabe alteracao
     → Se completamente fora: descarta
     → Se cabe: transforma em REVISION_NEEDED com instrucoes

NOTA IMPORTANTE: Copy Chief humano pode fazer double-check apos o agente.
O agente e primeiro filtro (pega 80% dos problemas), nao substituto.
```

### Fase 5: Delivery (Entrega)

```
5.1  Router por formato:

     SE IMAGEM / CARROSSEL / DINAMICO:
     → TASK PURA (generate-images): gera com IA
     → Define: imagem unica, carrossel ou dinamico
     → Sempre testa 5+ variacoes por criativo (cores, layout, texto, estilo)
     → Copy humano gera as imagens (usando o output da task como guia)

     SE VIDEO / UGC / PODCAST / AI AVATAR / ETC:
     → TASK PURA (build-video-brief): brief simples de edicao pro editor
     → NAO e scene-by-scene com timecodes detalhados
     → Define: tipo de edicao (UGC, cinematografica, podcast, breaking news, etc),
       persona e aparencia dos avatares, tom visual, copy na tela, CTA final
     → Editor tem liberdade criativa na execucao

     SE VARIACAO DE EXISTENTE:
     → TASK PURA (build-variation-brief): brief de variacao
     → Mantém mesma copy, muda apenas o elemento visual
       (avatar, tipo de edicao, hook visual, etc)

5.2  Editor (HUMANO) produz o video final

5.3  Copy (HUMANO) revisa se ficou dentro do que esperava

5.4  Aprovado → Handoff pro gestor de trafego
     → SAIDA DO SQUAD — entra no processo de trafego pago
```

---

## 4. Papeis no Pipeline

### Humanos (insubstituiveis)

| Papel | O que faz que SO humano faz | Pontos de intervencao |
|-------|----------------------------|----------------------|
| **Copy** | Spy, feeling de mercado, selecao de referencias, decisoes criativas finais | Fases 1.1, 1.3, 2.2, 2.3, 5.3 |
| **Copy Chief (humano)** | Double-check opcional apos agente | Fase 4 (quando quiser) |
| **Editor** | Produz video/imagem final | Fase 5.2 |

### Agentes (julgamento AI)

| Agente | Por que e AGENTE e nao task | Tasks que executa |
|--------|---------------------------|-------------------|
| **@stefan-georgi** | Faz julgamento criativo: tom, estilo, adaptacao cultural, escolha de hook | suggest-angles, generate-scripts, generate-ad-copy |
| **@copy-chief** | Julga se criativo "tem cara de winner" baseado em padroes. Interpreta dados com nuance. Faz trade-off entre risco e potencial. | interpret-offer-data, review-creative, request-revision |

> **Regra: se a task precisa de "sera que...", e agente. Se e "qual e o...", e task.**

### Tasks Puras (execucao mecanica)

| Task | O que faz | Precisa de agente? |
|------|-----------|-------------------|
| **fetch-offer-data** | Puxa dados brutos de performance | Nao — e consulta |
| **catalog-references** | Estrutura e categoriza referencias com metadata | Nao — e organizacao |
| **deconstruct-references** | Extrai Hook/Mechanism/Proof/CTA | Nao — processo estruturado |
| **generate-images** | Gera variacoes visuais com IA | Nao — wrapper de API |
| **build-video-brief** | Monta brief simples pro editor | Nao — segue template |
| **build-variation-brief** | Brief de variacao de winner existente | Nao — segue template |

---

## 5. Decisoes Arquiteturais (v2)

### Mudancas em relacao a v1

| Aspecto | v1 (original) | v2 (atual) | Razao |
|---------|--------------|------------|-------|
| Agentes | 5 (deconstructionist, copywriter, qa, image-generator, winners-analyst) | 3 (stefan-georgi, copy-chief, + tasks puras) | 3 dos 5 eram processos mecanicos vestidos de agente |
| Copy Chief | Nao existia | Agente novo | Era o review mais importante e estava faltando |
| QA Compliance | Agente separado (@creative-qa) | Funcao do @copy-chief | Review de compliance e parte do julgamento de qualidade do Chief |
| Desconstrucao | Agente (@deconstructionist) | Task pura | Processo 100% estruturado, sem decisao |
| Geracao de imagem | Agente (@image-generator) | Task pura | Wrapper de API, sem julgamento |
| Analise de winners | Agente (@winners-analyst) | Task pura (fetch) + agente (interpret) | Puxar dados e mecanico; interpretar e julgamento |
| Metodo 80/20 | Nao existia | Explicito no workflow | Modelagem vs inovacao e decisao real do dia a dia |
| Variacao de winner | Estava em delivery | Movido para strategy | E decisao estrategica, nao etapa de entrega |
| Brief de video | Detalhado (cena por cena) | Simples (editor tem liberdade) | Reflete como realmente funciona na operacao |

### @copy-chief: escopo completo

O Copy Chief e um agente COMPARTILHADO que atuara em multiplos squads:

```
squad: squad-copy         → revisa criativos + interpreta dados de performance
squad: dr-funnel-copy    → (futuro) revisa copy de funil, VSL, upsells
funcao CRO               → (futuro) propoe testes A/B, analisa conversao
```

Na definicao do squad, ele e referenciado como agente compartilhado.

---

## 6. Workflow: creative-pipeline (v2)

```
TRIGGER: Copy escolhe oferta e inicia processo

FASE 1: INTELLIGENCE
  TASK: fetch-offer-data → AGENTE: @copy-chief interpret-offer-data →
  HUMANO: Copy faz spy → TASK: catalog-references → TASK: deconstruct-references

FASE 2: STRATEGY
  AGENTE: @stefan-georgi suggest-angles → HUMANO: Copy escolhe metodo
    ├── Modelagem → Fase 3
    ├── Variacao de winner → TASK: build-variation-brief → Fase 5
    └── Do zero → Fase 3 (modo livre)

FASE 3: PRODUCTION
  AGENTE: @stefan-georgi generate-scripts + generate-ad-copy

FASE 4: REVIEW
  AGENTE: @copy-chief review-creative
    ├── APPROVED → Fase 5
    ├── REVISION_NEEDED → @stefan-georgi corrige → re-review (max 2x)
    └── REJECTED → descarta ou converte em revision

FASE 5: DELIVERY
  Router:
    ├── Imagem/Carrossel/Dinamico → TASK: generate-images
    ├── Video/UGC/Podcast/etc → TASK: build-video-brief
    └── Variacao de existente → TASK: build-variation-brief
  HUMANO: Editor produz → HUMANO: Copy revisa → Handoff trafego
```

### Pontos de intervencao humana

O workflow NAO e 100% autonomo. 4 pontos onde o humano intervem:

1. **Copy faz spy e salva referencias** (AI nao substitui o olho treinado)
2. **Copy escolhe angulos e metodo** (AI sugere, humano decide)
3. **Copy Chief humano pode revisar apos agente** (opcional, double-check)
4. **Copy aprova edicao final** (quality gate antes do trafego)

Entre esses pontos, tudo roda sozinho.

---

## 7. Gaps e Dores Identificados

### Riscos Criticos

| Risco | Severidade | Descricao |
|-------|-----------|-----------|
| Key-person risk | **CRITICA** | 1 copy faz tudo. Se ele falta, producao para |
| Sem biblioteca de referencias | **ALTA** | Refazem pesquisa ja feita, perdem angulos winners |
| Revisao fraca | **ALTA** | Copy revisa o proprio trabalho (vies de confirmacao) |
| Sem compliance por geo | **ALTA** | Claims que passam nos EUA podem bloquear gateway frances |
| Feedback loop informal | **MEDIA** | Copy analisa metricas em tempo real no Facebook, mas sem registro estruturado |
| Conhecimento tacito | **MEDIA** | Tudo que funciona esta na cabeca do copy |

### Gargalos de Fluxo

| Gargalo | Impacto |
|---------|---------|
| Copy e single-threaded | Spy, script e revisao competem pelo mesmo recurso |
| Editores ociosos de manha | Material chega concentrado na segunda metade do dia |
| Revisao interrompe producao | Copy para de escrever pra revisar |

---

## 8. Criterios de Performance

| Metrica | Criterio |
|---------|----------|
| **Escalar** | 2+ vendas com ROAS 1.3+ |
| **Winner forte** | ROAS 2.0+ sustentado por 48h+ |
| **Mega winner** | ROAS 3.0+ sustentado por 7 dias+ |
| **Matar** | Gastou 1 CPA cheio sem resultado |
| **Vigiar** | Gastou 0.5 CPA sem resultado |
| **Volume de teste** | Minimo 50 criativos por oferta na validacao |
| **Filosofia** | Volume e o jogo — apos validacao, escala agressiva |

---

## 9. Formatos Suportados

- Imagem estatica
- Carrossel
- Criativo dinamico (Meta)
- VSL (Video Sales Letter)
- UGC (User Generated Content)
- Podcast
- AI Avatar
- Breaking News
- Cinematografico
- Qualquer formato hypado no organico

---

## 10. Geos e Adaptacao Cultural

| Geo | Regras de Tom | Compliance Especifico |
|-----|--------------|----------------------|
| **FR (Frances)** | Formal, elegante, sofisticado. Evitar hype americano. Argumentacao logica. | Gateway FR rigoroso com claims de saude |
| **ES (Espanhol)** | Caloroso, emocional, proximo. Enfase em familia, comunidade, transformacao pessoal. | Menor restricao, mas atencao a claims financeiros |
| **EN (Ingles/EUA)** | Direto, urgente, orientado a resultados. Enfase em numeros, ROI, velocidade. | FTC guidelines, health claims, income claims |

Adaptacao cultural = NUNCA traducao literal. Cada geo tem tom, referencias e sensibilidades proprias.

---

## 11. Ferramentas Atuais

| Categoria | Ferramentas |
|-----------|-------------|
| **Spy** | Meta Ad Library, TikTok Creative Center, Swipe Files |
| **Pesquisa organico** | TikTok, Instagram, YouTube, Reddit |
| **Edicao** | CapCut, Canva, editores profissionais |
| **IA** | Gemini, ChatGPT, Dream Face, Nano Banana |
| **Handoff** | Notion |
| **Comunicacao** | WhatsApp, Call |

---

## 12. Resultado Esperado com Automacao

| Metrica | Atual | Esperado |
|---------|-------|----------|
| Tempo do copy em spy | ~2h/dia | ~2h/dia (mantido — e o valor dele) |
| Tempo do copy em script | ~5h/dia | ~30min/dia (revisao do output do agente) |
| Tempo do copy em revisao | ~1-2h/dia | ~15min/dia (agente Chief faz primeiro filtro) |
| Output diario | 10-15 criativos | 20-30+ criativos (mesmo time) |
| Ociosidade editores | ~2-3h/dia | ~0-1h/dia |
| Compliance check | Inexistente | 100% automatico (advisory mode) |
| Win rate tracking | Na cabeca do copy | Automatico por tags |
| Interpretacao de dados | Informal (Facebook ao vivo) | Estruturada pelo @copy-chief |

---

## 13. Agentes e Tasks Sugeridos para a Squad

### Agentes (2 + 1 compartilhado)

| Agente | Tipo | Funcao Core |
|--------|------|-------------|
| **@stefan-georgi** | Local (exclusivo do squad) | Geracao de scripts, variacoes, sugestao de angulos, adaptacao cultural |
| **@copy-chief** | Compartilhado (atua em multiplos squads) | Review de qualidade, interpretacao de dados, decisao corrigir/descartar |

### Tasks Puras (6)

| Task | Input | Output |
|------|-------|--------|
| **fetch-offer-data** | offer_id | dados brutos de performance |
| **catalog-references** | referencias brutas do Copy | referencias estruturadas com metadata |
| **deconstruct-references** | referencias catalogadas | Hook/Mechanism/Proof/CTA + patterns |
| **generate-images** | script aprovado, formato, geo | prompts de imagem + variacoes |
| **build-video-brief** | script aprovado, estilo de edicao, persona | brief simples pro editor |
| **build-variation-brief** | creative_id, tipo de variacao | brief de variacao (mesma copy, nova embalagem) |

### Tasks Executadas por Agentes (5)

| Task | Executor | Input | Output |
|------|----------|-------|--------|
| **interpret-offer-data** | @copy-chief | dados brutos | analise contextualizada + recomendacao |
| **suggest-angles** | @stefan-georgi | patterns + winners + offer data | angulos rankeados por confianca |
| **generate-scripts** | @stefan-georgi | angulos, offer, geo, formato, metodo | 5-10 variacoes de script |
| **generate-ad-copy** | @stefan-georgi | scripts aprovados, plataforma | headlines, descriptions, captions |
| **review-creative** | @copy-chief | scripts + contexto de oferta/funil | APPROVED / REVISION_NEEDED / REJECTED |

> Nota: nomes finais e detalhes serao refinados pelo @squad-creator durante *design-squad.

---

## 14. Squads Futuros no Departamento de Marketing

| Squad | Status | Dependencia |
|-------|--------|-------------|
| **squad-copy** | Implementando (v4) | — |
| **dr-funnel-copy** | Planejado | Apos squad-copy rodar 2-4 semanas |
| **CRO** | Funcao do @copy-chief por enquanto | Vira squad quando tiver 3+ funis simultaneos |
| **dr-traffic** | Planejado | Apos funnel-copy |

O @copy-chief e o agente que conecta todos esses squads.

---

*Documento atualizado em 2026-02-17 — Sessao de arquitetura com owner*
*v1: Advanced Elicitation com @aios-master (Orion) em 2026-02-15*
*v2: Redesign task-first com reducao de agentes em 2026-02-17*
*Synkra AIOS v2.1 — B2G Capital*
