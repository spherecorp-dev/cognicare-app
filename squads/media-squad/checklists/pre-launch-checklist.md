# Pre-Launch Checklist

> Validacao obrigatoria antes de publicar qualquer campanha Meta Ads
> Squad: media-squad
> Created: 2026-02-21

---

## Pre-Conditions

Antes de iniciar, verificar:

- [ ] Oferta aprovada e landing page no ar
- [ ] Budget definido e aprovado pelo media-head
- [ ] Business Manager em status saudavel

---

## Checklist Items

### 1. Estrategia (media-head)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | Contexto da campanha analisado (historico, competidores) | [ ] | |
| 1.2 | Estrutura definida (CBO/ABO, # adsets, # ads) | [ ] | |
| 1.3 | Budget alocado com limites diarios definidos | [ ] | |
| 1.4 | Estrategia de bidding escolhida e justificada | [ ] | |
| 1.5 | Funnel/LP/angulo da oferta definido | [ ] | |
| 1.6 | Plano de contingencia criado (Plan B) | [ ] | |
| 1.7 | Decisao GO/NO-GO registrada no decision log | [ ] | |

### 2. Tracking & Infraestrutura (media-engineer)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | RedTrack integrado e campanha criada | [ ] | |
| 2.2 | Meta Pixel instalado e disparando | [ ] | |
| 2.3 | Postback RedTrack → Meta configurado | [ ] | |
| 2.4 | Dominio configurado e verificado | [ ] | |
| 2.5 | Fluxo completo testado (click → LP → conversao → postback) | [ ] | |
| 2.6 | Atribuicao de vendas verificada | [ ] | |

### 3. Criativos & Ads (media-buyer)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | Copy aprovado (headline, body, CTA) | [ ] | |
| 3.2 | Criativos (imagens/videos) nos specs da Meta | [ ] | |
| 3.3 | Assets uploadados para o Meta | [ ] | |
| 3.4 | Ad preview revisado em todos os placements | [ ] | |
| 3.5 | UTMs e tracking params corretos nos links | [ ] | |

### 4. Compliance & Seguranca

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | Ad copy em conformidade com politicas Meta | [ ] | |
| 4.2 | LP sem conteudo proibido/restrito | [ ] | |
| 4.3 | Disclaimers necessarios presentes | [ ] | |
| 4.4 | Account warmup realizado (se conta nova) | [ ] | |

---

## Post-Conditions

Apos aprovacao de todos os items:

- [ ] Campanha publicada no Meta Ads
- [ ] Decisao de lancamento registrada no decision log
- [ ] Monitoramento ativado (workflow monitoring-alert)

---

## Sign-off

| Role | Agent | Date | Status |
|------|-------|------|--------|
| Strategy | media-head | | |
| Infrastructure | media-engineer | | |
| Execution | media-buyer | | |
| Final Approval | media-head | | |

---

## Usage

```bash
# Usar antes de publicar campanha:
*checklist pre-launch-checklist

# Referenciado no workflow:
# campaign-launch.yaml (pre-validation)
```

---

*Checklist created by squad-creator*
