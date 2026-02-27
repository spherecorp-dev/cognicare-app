# B2G Capital — Company Brief

> Documento base para todos os agentes e squads do AIOS.
> Ultima atualizacao: 2026-02-15

---

## 1. Identidade

| Campo | Valor |
|-------|-------|
| **Nome** | B2G Capital |
| **Modelo** | Venture Builder + Direct Response |
| **Mercado** | Global (multi-geo, multi-idioma) |
| **Tamanho do time** | 1-5 pessoas (micro-operacao de alta eficiencia) |
| **Filosofia** | Alta receita por funcionario. IA substitui funcoes repetitivas, humanos so em posicoes diferenciadas. |

---

## 2. Unidades de Negocio

### 2.1 Direct Response (Operacao Atual)

**Modelo:** Infoprodutos digitais com recorrencia oculta, aquisicao via trafego pago agressivo.

**Verticais:**
- **Saude** — vertical principal (operacao ativa)
- **Dating** — nos planos de expansao
- **Nutraceuticos** — planejado como produto de backend (afiliado), ainda nao implementado

**Estrutura de oferta:**
- **Front-end:** Venda direta sem mencao a recorrencia. Valor menor (entrada)
- **Upsell / Downsell:** Sim, integrados ao funil
- **Backend:** Planejado com nutraceuticos (afiliado) — nao implementado ainda
- **Recorrencia:** Mensal. Primeiro rebill valor menor, depois valor maior

**Geos ativos:**
- Frances — Worldwide
- Espanhol — Worldwide
- Ingles — EUA

**Volume:**
- Spend mensal na faixa de 6 digitos
- Dias individuais variam (nem sempre 5 digitos/dia)
- Quando oferta esta validada, escala agressiva sem teto definido

**Abordagem:** Black hat com ofertas white para compliance de gateway

**Desafio principal:** Alto indice de chargeback — ofertas white mitigam risco com processadores

**Foco de crescimento:** Aumentar MRR via escala de trafego antes de diversificar canais

**Metricas-chave:** MRR, chargeback rate, CPA, LTV, ROAS, approval rate

### 2.2 Venture Builder de Apps (Transicao)

**Modelo:** Construir e validar apps AI-based como produtos escalaveis.

**Formato:** PWA primeiro (6 meses de validacao), app stores so apos validacao
**Diferencial:** Todos os PWAs sao AI-based
**Aquisicao:** Trafego pago como canal primario (mesmo modelo hardcore da DR)
**Monetizacao:** Sempre recorrencia (subscription). Estrategia de funil (free trial, paid trial, etc) varia por produto — testa-se multiplas abordagens.

**Verticais potenciais:** Pet, memoria, dating, emagrecimento, exercicios, saude em geral — sem padrao fixo, oportunidade define.

**App em desenvolvimento:**
- **Waggo.ai** — Cardapios de alimentacao natural para pets (caes e gatos) gerados por IA. Mercado inicial: EUA.

**Criterio de sucesso:** Validacao de PMF e unit economics em 6 meses de PWA

---

## 3. Stack Tecnica Atual

| Camada | Ferramentas |
|--------|-------------|
| **Trafego** | Meta Ads (principal), TikTok Ads (em testes) — Youtube Ads e Native Ads planejados |
| **Tracking/Cloaking** | Redtrack |
| **Pagamentos (DR)** | Cartpanda (gateway + checkout + retry de cartao recusado) |
| **Pagamentos (futuro white)** | Stripe (planejado para operacao white/apps) |
| **CRM** | CRM proprio + integracao Cartpanda |
| **Email Marketing** | ActiveCampaign |
| **SMS / Push** | Em breve (planejado) |
| **Hosting LPs (DR)** | Hostinger (hospedagem simples), Hotflux, Atomicat |
| **Hosting Apps** | Supabase / Firebase |
| **Backend/DB** | Supabase / Firebase |
| **Dominios (DR)** | Multiplos dominios coringa para Meta Ads, sem padrao fixo |
| **Dominios (Apps)** | Dominio unico por PWA, subdominio por idioma |
| **IA** | Claude, GPT, Gemini, Eleven Labs, Dream Face — stack expansivel conforme necessidade |
| **Automacao** | A implementar (n8n planejado) |

---

## 4. Modelo de Aquisicao

```
Trafego Pago (Meta Ads, TikTok Ads, Youtube Ads*, Native Ads*)
    ↓                                     * = planejado para 2026
Landing Page / VSL / Oferta
    ↓
Checkout (Cartpanda) — venda direta, sem mencao a recorrencia
    ↓
Front-end (valor menor) + Upsell / Downsell
    ↓
Entrega digital + Recorrencia mensal (valor maior a partir do 2o rebill)
    ↓
Retencao / Suporte / Anti-chargeback
```

**Pos-venda e retencao:**
- **Cancelamento:** Facilitado (cliente consegue cancelar)
- **Reembolso:** Dificultado (processo nao e simples)
- **Suporte:** Ponto fraco reconhecido — area de melhoria prioritaria
- **Valor agregado pos-venda:** Inexistente atualmente
- **Anti-chargeback:** Limitado pela Cartpanda (nao suporta alertas Ethoca/Verifi). Chargebacks que chegam sao repassados. Mitigacao via suporte e reembolso seletivo (equilibrio entre chargeback rate e margem)
- **Retry de pagamento:** Cartpanda faz 2-3 tentativas automaticas com desconto para cartao recusado. So cartao (sem boleto)

**Principios:**
- Trafego pago e o canal primario — diversificacao de plataformas (nao de canal)
- Cada real investido deve ter tracking granular
- Criativos sao o principal alavanca de escala (fadiga = morte da campanha)
- Compliance de gateway e prioridade operacional (chargeback < threshold)
- Reembolso seletivo: equilibrar chargeback rate vs margem (reembolsar tudo mata a margem, nao reembolsar nada mata o gateway)

---

## 5. Visao Estrategica

### Curto prazo (0-6 meses)
- Escalar MRR da operacao DR atual
- Lancar primeiros PWAs AI-based
- Implementar AIOS para automacao maxima
- Reduzir chargeback rate com ofertas white e processos

### Medio prazo (6-18 meses)
- Validar PWAs e migrar winners para app stores
- Construir portfolio de apps como Venture Builder
- Diversificar geos e ofertas
- Manter time enxuto com AIOS como multiplicador

### Longo prazo (18+ meses)
- Empresa com receita por funcionario de nivel excepcional
- Portfolio de apps AI-based gerando receita recorrente
- Operacao DR altamente automatizada
- AIOS como sistema nervoso central de todas as operacoes

---

## 6. Cultura & Principios Operacionais

1. **Eficiencia acima de tudo** — Se pode ser automatizado, sera automatizado
2. **Data-driven** — Decisoes baseadas em metricas, nunca em feeling
3. **Speed > Perfection** — Validar rapido, iterar, escalar o que funciona
4. **AI-first** — IA nao e ferramenta auxiliar, e parte core do produto e da operacao
5. **Lean team** — Cada pessoa no time deve ser insubstituivel por IA. Se a IA faz igual, a pessoa sai

---

## 7. Publico-Alvo (Perfil Geral)

> Varia por oferta, mas o perfil predominante na operacao DR:

- **Faixa etaria:** Mais velho (35-65+)
- **Poder aquisitivo:** Medio-alto (operam em moeda forte — USD, EUR)
- **Comportamento:** Compra impulsiva. Alta propensao a reclamar pos-compra
- **Idiomas:** Frances, espanhol, ingles
- **Padrao:** Compram rapido, pedem reembolso/chargeback depois. Suporte e anti-chargeback sao criticos por causa desse perfil

> Para apps (Venture Builder), o publico sera definido por produto. Waggo.ai: donos de pets nos EUA.

---

## 8. Posicionamento & Concorrencia

**B2G Capital nao tem posicionamento publico.** No modelo DR, nao existe branding — cada oferta e uma entidade isolada.

**Posicionamento interno (para colaboradores/investidores):**
- Venture Builder de alta eficiencia com IA
- Futuro potencial: ecossistema de educacao e conteudo

**Concorrencia:**
- No DR: concorrencia e por oferta/vertical, nao por marca. Benchmark sao outros media buyers e operacoes similares no mercado global
- Nos Apps: concorrencia sera mapeada por produto individualmente (ex: Waggo.ai vs apps de nutricao pet existentes)

---

## 9. Areas Funcionais

> Squads serao criadas incrementalmente, uma por vez, conforme necessidade. A granularidade (squad por departamento vs squad por funcao especifica) sera definida durante o processo de design de cada squad.

**Areas identificadas (sem ordem definida de implementacao):**
- Marketing & Criativos
- Media Buying / Trafego
- Financeiro / Gateway
- Produto / Apps
- Operacoes / Automacao
- Vendas / CRM

---

## 10. Integracoes Planejadas (MCPs)

| MCP | Prioridade | Funcao |
|-----|-----------|--------|
| **Supabase** | Alta | Banco de dados, metricas, historico |
| **n8n** | Alta | Scheduler, automacao, webhooks |
| **Facebook Marketing API** | Alta | Dados de campanha, deploy de ads |
| **TikTok Marketing API** | Media | Dados e gestao de campanhas TikTok |
| **ActiveCampaign API** | Media | Email marketing, automacoes de email |
| **Cartpanda API** | Media | Dados de vendas, chargeback, retry |
| **Stripe API** | Baixa | Futuro — operacao white e apps |
| **EXA** | Media | Pesquisa web, analise competitiva |
| **Apify** | Baixa | Scraping, dados de concorrentes |
| **Playwright** | Baixa | Automacao de browser, screenshots |

---

## 11. Riscos Conhecidos

| Risco | Severidade | Mitigacao |
|-------|-----------|-----------|
| Chargeback rate acima do threshold do gateway | **Critica** | Ofertas white, processos de retencao, monitoramento |
| Ban de contas Meta Ads | **Alta** | Multi-BM, aquecimento, compliance |
| Dependencia de unico canal (Meta) | **Media** | Diversificacao em andamento: TikTok (testando), Youtube e Native (planejados) |
| Key-person risk (time de 1-5) | **Media** | AIOS como backup de conhecimento e processos |

---

## 12. Metricas Globais da Empresa

| Metrica | Descricao |
|---------|-----------|
| **MRR** | Receita recorrente mensal (DR + Apps) |
| **Revenue per Employee** | Receita total / numero de pessoas |
| **Chargeback Rate** | % de chargebacks vs transacoes |
| **ROAS** | Return on Ad Spend por campanha/geo |
| **CAC** | Custo de aquisicao de cliente |
| **LTV** | Lifetime value por cohort |
| **Burn Rate** | Queima mensal (trafego + infra + team) |
| **PWA Validation Rate** | % de PWAs que passam da validacao de 6 meses |

---

*Documento gerado por @squad-creator (Craft) em 2026-02-15*
*Synkra AIOS v2.1 — B2G Capital*
