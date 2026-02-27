# Tracking Verification Checklist

> Verificacao end-to-end de infraestrutura de tracking RedTrack + Meta Pixel
> Squad: media-squad
> Created: 2026-02-21

---

## Pre-Conditions

Antes de iniciar, verificar:

- [ ] Acesso ao painel RedTrack
- [ ] Acesso ao Meta Events Manager
- [ ] LP/oferta online e acessivel

---

## Checklist Items

### 1. RedTrack Setup

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | Campanha criada no RedTrack | [ ] | |
| 1.2 | Offer configurada com payout correto | [ ] | |
| 1.3 | Traffic source (Meta) configurado | [ ] | |
| 1.4 | Tracking URL gerada e funcional (HTTP 200/302) | [ ] | |
| 1.5 | Landing page URL correta no RedTrack | [ ] | |

### 2. Meta Pixel

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | Pixel ID correto instalado na LP | [ ] | |
| 2.2 | PageView event disparando no load | [ ] | |
| 2.3 | Eventos de conversao configurados (Purchase, Lead, etc) | [ ] | |
| 2.4 | Pixel Helper sem erros | [ ] | |
| 2.5 | Events Manager recebendo eventos | [ ] | |

### 3. Postback & Atribuicao

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | Postback URL configurada no RedTrack | [ ] | |
| 3.2 | Postback testado com conversao simulada | [ ] | |
| 3.3 | Meta recebendo conversao via postback | [ ] | |
| 3.4 | Valores de conversao (revenue) corretos | [ ] | |
| 3.5 | Deduplicacao funcionando (sem double-count) | [ ] | |

### 4. Dominio & DNS

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | Dominio verificado no Meta Business Manager | [ ] | |
| 4.2 | SSL/HTTPS ativo e valido | [ ] | |
| 4.3 | DNS propagado corretamente | [ ] | |
| 4.4 | Dominio nao esta em blacklist | [ ] | |

### 5. Teste End-to-End

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | Click no tracking URL redireciona para LP | [ ] | |
| 5.2 | LP carrega sem erros | [ ] | |
| 5.3 | Conversao no checkout registra no RedTrack | [ ] | |
| 5.4 | Postback dispara para Meta | [ ] | |
| 5.5 | Dados batem: RedTrack clicks = Meta clicks (±5%) | [ ] | |

---

## Post-Conditions

Apos aprovacao de todos os items:

- [ ] Tracking pronto para lancamento
- [ ] Screenshot do teste salvo como evidencia
- [ ] Media-head notificado de tracking ready

---

## Sign-off

| Role | Agent | Date | Status |
|------|-------|------|--------|
| Setup | media-engineer | | |
| Verification | media-engineer | | |

---

## Usage

```bash
*checklist tracking-verification-checklist

# Referenciado no workflow:
# tracking-setup.yaml (post-validation)
```

---

*Checklist created by squad-creator*
