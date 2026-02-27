# Account Health Checklist

> Verificacao de saude do Business Manager e contas de anuncio Meta
> Squad: media-squad
> Created: 2026-02-21

---

## Pre-Conditions

Antes de iniciar, verificar:

- [ ] Acesso ao Meta Business Manager
- [ ] Permissoes de admin ou advertiser

---

## Checklist Items

### 1. Business Manager

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | BM verificado (business verification complete) | [ ] | |
| 1.2 | Sem restricoes ou flags ativas | [ ] | |
| 1.3 | 2FA ativado em todos os admins | [ ] | |
| 1.4 | Usuarios com permissoes corretas (principio do menor privilegio) | [ ] | |
| 1.5 | Paginas vinculadas e ativas | [ ] | |

### 2. Ad Account

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | Status da conta: Active | [ ] | |
| 2.2 | Sem policy violations pendentes | [ ] | |
| 2.3 | Metodo de pagamento ativo e valido | [ ] | |
| 2.4 | Limite de gasto adequado para operacao | [ ] | |
| 2.5 | Timezone e moeda configurados corretamente | [ ] | |

### 3. Pixels & Eventos

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | Pixel principal ativo e recebendo eventos | [ ] | |
| 3.2 | Eventos de conversao configurados | [ ] | |
| 3.3 | Sem erros no Events Manager | [ ] | |
| 3.4 | Aggregated Event Measurement configurado | [ ] | |

### 4. Dominios

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | Dominios verificados no BM | [ ] | |
| 4.2 | SSL ativo em todos os dominios | [ ] | |
| 4.3 | Nenhum dominio em blacklist ou flagged | [ ] | |

### 5. Seguranca & Warmup

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | Perfis de warmup ativos (Multilogin se aplicavel) | [ ] | |
| 5.2 | IPs/proxies nao flagged | [ ] | |
| 5.3 | Atividade organica recente nas paginas | [ ] | |
| 5.4 | Historico de spend consistente (sem spikes suspeitos) | [ ] | |

---

## Post-Conditions

Apos verificacao:

- [ ] Score de saude calculado (items OK / total)
- [ ] Issues criticos escalados para resolucao imediata
- [ ] Proxima verificacao agendada

---

## Severity Levels

| Score | Status | Acao |
|-------|--------|------|
| 100% | Saudavel | Nenhuma acao necessaria |
| 80-99% | Atencao | Resolver items pendentes em 48h |
| 60-79% | Warning | Resolver antes de novas campanhas |
| < 60% | Critico | PARAR lancamentos, resolver imediatamente |

---

## Sign-off

| Role | Agent | Date | Status |
|------|-------|------|--------|
| Verification | media-engineer | | |
| Approval | media-head | | |

---

## Usage

```bash
*checklist account-health-checklist

# Recomendado: executar semanalmente
# Referenciado em: check-business-manager-health task
```

---

*Checklist created by squad-creator*
