# media-squad

Squad especializado em gestão de campanhas Meta Ads com decisões estratégicas orientadas por dados, infraestrutura de tracking via RedTrack, execução automatizada e análise/otimização em tempo real.

## 🎯 Overview

Este squad implementa um fluxo completo de gestão de campanhas Meta Ads focado em:
- **Decisões estratégicas com aprendizado contínuo** (via decision log)
- **Infraestrutura de tracking robusta** (RedTrack + Meta CAPI)
- **Execução mecânica eficiente** (Meta Ads API)
- **Monitoramento 24/7 e análise preditiva**

**Plataforma atual:** Meta Ads (Facebook/Instagram)
**Expansão planejada:** TikTok, Google Ads, Native Ads

## 🤖 Available Agents

### 1. 🎯 media-head (Estrategista)
Cérebro estratégico do squad - toma decisões baseadas em dados e aprende com histórico.

**Commands:**
- `*analyze-context` - Analisa contexto da oferta
- `*decide-structure` - Define estrutura de campanha
- `*define-budget` - Aloca budget
- `*define-bidding` - Define estratégia de lances
- `*define-funnel` - Define landing page e funil
- `*create-contingency` - Cria plano B
- `*log-decision` - Registra decisão
- `*approve-launch` - Decisão final GO/NO-GO

### 2. 🔧 media-engineer (Infraestrutura)
Especialista técnico - garante que tracking funciona perfeitamente.

**Commands:**
- `*setup-redtrack` - Integra com RedTrack
- `*setup-pixel` - Configura pixels
- `*verify-attribution` - Valida atribuição
- `*configure-postback` - Configura postbacks
- `*warm-account` - Aquece perfis
- `*check-bm-health` - Verifica Business Manager
- `*setup-domain` - Configura domínios
- `*test-tracking` - Testa fluxo completo

### 3. 🚀 media-buyer (Executor)
Executor generalista - publica campanhas e otimiza em tempo real.

**Commands:**
- `*assemble-ad` - Monta ad completo
- `*publish-campaign` - Publica campanha
- `*upload-creative` - Upload de criativos
- `*adjust-bid` - Ajusta lances
- `*reallocate-budget` - Realoca budget
- `*scale-winner` - Escala winners
- `*pause-loser` - Pausa losers

### 4. 📊 media-analyst (Monitor & Analista)
Monitor 24/7 e analista - detecta problemas e recomenda ações.

**Commands:**
- `*monitor-anomalies` - Monitora anomalias
- `*detect-rejected` - Detecta criativos rejeitados
- `*alert-critical` - Envia alertas críticos
- `*auto-recover` - Auto-recovery
- `*collect-metrics` - Coleta métricas
- `*analyze-kpis` - Análise diária
- `*classify-performance` - Classifica WINNER/LOSER
- `*detect-trends` - Detecta tendências
- `*generate-report` - Relatório semanal
- `*recommend-actions` - Recomenda ações

## 📋 Workflow Típico

### 1. Setup Inicial
```
@media-engineer *setup-redtrack offer_123
@media-engineer *setup-pixel
@media-engineer *test-tracking
```

### 2. Decisão Estratégica
```
@media-head *analyze-context offer_123 creative_456,creative_789
@media-head *decide-structure
@media-head *define-budget
@media-head *define-bidding
@media-head *approve-launch
```

### 3. Execução
```
@media-buyer *assemble-ad creative_456
@media-buyer *publish-campaign
```

### 4. Monitoramento & Otimização
```
@media-analyst *monitor-anomalies (24/7)
@media-analyst *classify-performance (daily)
@media-buyer *scale-winner ad_123 (based on analyst recommendations)
```

## 📁 Structure

```
media-squad/
├── squad.yaml              # Manifest
├── README.md               # This file
├── config/
│   ├── meta-ad-specs.md            # Meta Ads specifications
│   ├── redtrack-config.md          # RedTrack integration guide
│   └── classification-rules.md     # Winner/Loser classification rules
├── agents/
│   ├── media-head.md               # Estrategista
│   ├── media-engineer.md           # Infraestrutura
│   ├── media-buyer.md              # Executor
│   └── media-analyst.md            # Monitor & Analista
└── tasks/
    ├── (8 media-head tasks)
    ├── (8 media-engineer tasks)
    ├── (7 media-buyer tasks)
    └── (10 media-analyst tasks)
```

## 🔧 Configuration

### Required External Services
- **Meta Ads Account** (Business Manager)
- **RedTrack** (tracking platform)
- **Multilogin** (optional, for account warming)

### Environment Variables
```bash
META_ACCESS_TOKEN=your_access_token
META_AD_ACCOUNT_ID=act_123456789
REDTRACK_API_KEY=your_api_key
REDTRACK_DOMAIN=tracking.yourdomain.com
```

### Node Dependencies
```bash
npm install facebook-nodejs-business-sdk axios
```

## 📖 Key Concepts

### Decision Log
Registro estruturado de todas as decisões estratégicas para aprendizado contínuo:
- Input context (oferta, creative profile, etc.)
- Decisão tomada
- Justificativa
- Resultados (adicionados posteriormente pelo analyst)

### Creative Profiles
- **Blackhat DR:** Aggressive scaling, high turnover, cost cap bidding
- **Whitehat:** Sustainable scaling, brand safety, conservative bidding
- **SaaS:** Lead quality focus, longer evaluation, lowest cost bidding

### Winner/Loser Classification
- **WINNER:** CPA ≤ target, ≥2 conversions → Scale
- **LOSER:** CPA > 2x target, sufficient spend → Pause
- **TESTING:** Insufficient data → Wait

## 🚀 Next Steps

1. **Configure RedTrack integration** (see `config/redtrack-config.md`)
2. **Setup Meta Ads API access**
3. **Run first campaign with @media-head guidance**
4. **Monitor decision log for learning patterns**
5. **Expand to TikTok/Google when ready**

## 📚 Documentation

- [Meta Ad Specs](config/meta-ad-specs.md)
- [RedTrack Config](config/redtrack-config.md)
- [Classification Rules](config/classification-rules.md)

## 🤝 Contributing

To extend this squad:
1. Add new agents in `agents/` (follow existing format)
2. Add new tasks in `tasks/` (task-first!)
3. Update `squad.yaml` components section
4. Validate: `@squad-creator *validate-squad media-squad`

## 📄 License

MIT

---

**Created by:** squad-creator (Craft)
**Created from:** [Blueprint](../squads/.designs/media-squad-design.yaml)
**Confidence:** 93%
