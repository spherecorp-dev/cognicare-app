# Error Handling Strategy — squad-copy

**Squad:** squad-copy (Persuasion Engine)
**Version:** 4.0.1
**Last Updated:** 2026-02-20

---

## 1. Princípios de Error Handling

### 1.1 Fail Fast, Recover Smart
- **Validar inputs ANTES de processar** (pre-conditions impedem trabalho desperdiçado)
- **Falhar com contexto claro** (mensagens de erro devem indicar ONDE e POR QUÊ)
- **Estratégias de fallback** quando possível (degradação graciosa)

### 1.2 Never Lose User Work
- **Auto-save de progresso** em tasks longas (generate-images-api salva após cada conceito)
- **Estado recuperável** (tasks devem poder retomar de onde pararam)
- **Outputs parciais válidos** (se 7/10 conceitos funcionaram, entregar os 7)

### 1.3 Clear Error Attribution
- **API errors** → Indicar serviço (DALL-E, MidJourney, etc.)
- **Validation errors** → Indicar regra violada (compliance, pre-condition, checklist)
- **Data errors** → Indicar arquivo/campo faltante (offer.yaml missing field)

---

## 2. Categorias de Erros e Respostas

### 2.1 INPUT ERRORS (User/Configuration)

| Erro | Causa | Resposta |
|------|-------|---------|
| **Offer file missing** | `data/offers/{ID}/offer.yaml` não existe | BLOCK com mensagem clara: "Offer {ID} not found. Expected: data/offers/{ID}/offer.yaml" |
| **Invalid offer.yaml** | Campo obrigatório faltando | BLOCK com field names: "Missing required fields: icp.demographics, mechanism.big_idea" |
| **Compliance rules missing** | `compliance/rules.md` não existe | BLOCK: "Compliance rules required. Create: {path}/compliance/rules.md" |
| **Performance data missing** | `performance.yaml` ausente | WARN + usar valores padrão: "No performance.yaml found. Using default method distribution: 50% modelagem, 30% variação, 20% do-zero" |
| **Invalid method** | Usuário escolheu método inexistente | BLOCK: "Method '{method}' not recognized. Available: modelagem, variacao, do-zero" |

**Princípio:** BLOCK em dados obrigatórios, WARN + fallback em dados opcionais.

---

### 2.2 API ERRORS (External Services)

| Serviço | Erro Comum | Resposta | Fallback |
|---------|-----------|---------|---------|
| **DALL-E** | Rate limit (429) | Retry com exponential backoff (3x: 2s, 4s, 8s) | Se persiste → WARN + skip conceito |
| **DALL-E** | Content policy (400) | Log prompt rejeitado, ajustar automaticamente (remover palavras sensíveis) | Retry 1x com prompt sanitizado |
| **DALL-E** | Auth error (401) | BLOCK imediatamente: "DALL-E API key invalid or expired" | Nenhum (requer fix manual) |
| **MidJourney** | Job timeout (>5min) | Cancelar, tentar com prompt simplificado | Se persiste → skip conceito |
| **MidJourney** | Connection error | Retry 2x (5s delay) | Se persiste → WARN + skip |

**Logging:** SEMPRE logar API errors em `logs/api-errors-{timestamp}.jsonl` com:
```json
{
  "timestamp": "2026-02-20T14:32:01Z",
  "service": "dall-e",
  "error_code": 429,
  "message": "Rate limit exceeded",
  "prompt": "...",
  "retry_attempt": 2,
  "resolution": "skipped_after_retries"
}
```

---

### 2.3 VALIDATION ERRORS (Compliance/Quality)

| Validação | Erro | Resposta |
|-----------|------|---------|
| **Compliance check** | Ad copy viola regra geo-específica (ex: "cura" em FR) | BLOCK com regra violada: "REJECTED: Headline contains prohibited claim 'guérit' (FR-DGCCRF prohibits cure claims)" |
| **Compliance check** | Visual viola regra platform (ex: before/after em Meta) | BLOCK: "REJECTED: Before/after image not allowed on Meta Health category" |
| **Ad copy review** | Score < 2.0 em checklist | BLOCK: "REJECTED by @copy-chief. Scores: Compliance 1/5, Persuasion 2/5. See checklist for details." |
| **Image concept review** | Visual clarity score < 2.0 | REVISION_NEEDED: "Concept needs improvement. Visual Clarity: 1.5/5. Recommendation: {specific feedback}" |

**Princípio:** Compliance = BLOCK sempre. Quality < threshold = REVISION_NEEDED (não bloqueia, mas marca para fix).

---

### 2.4 PIPELINE ERRORS (Orchestration)

| Erro | Causa | Resposta |
|------|-------|---------|
| **Pre-condition not met** | Task invocada sem dependência resolvida | BLOCK: "Cannot execute generate-image-concepts. Pre-condition failed: angles not selected. Run select-method first." |
| **Post-condition failed** | Task completou mas output inválido | ROLLBACK + WARN: "Task completed but output invalid. Expected 3 angles, got 0. Reverting state." |
| **Workflow timeout** | Pipeline execução > 30min (limite padrão) | CHECKPOINT: Salvar estado atual, PAUSE, notificar usuário: "Workflow paused after 30min. Resume with *resume-pipeline {ID}" |
| **Circular dependency** | Task A depende de B, B depende de A | BLOCK (detecção em pre-flight): "Circular dependency detected: suggest-angles ↔ select-method. Review task dependencies." |

**Tracking:** Erros de orquestração salvos em `logs/pipeline-errors-{timestamp}.yaml` com:
```yaml
timestamp: "2026-02-20T14:45:00Z"
workflow: "creative-pipeline-imagem"
failed_task: "generate-image-concepts"
error_type: "pre-condition-not-met"
missing_dependency: "interpret-offer-data.output.analysis"
resolution: "blocked_execution"
```

---

## 3. Recovery Strategies

### 3.1 Auto-Recovery (Sem intervenção humana)

**Quando usar:**
- API rate limits (retry automático)
- Timeouts temporários (retry com backoff)
- Content policy minor (sanitizar prompt e retry)

**Implementação:**
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(2 ** i * 1000); // 1s, 2s, 4s
    }
  }
}
```

---

### 3.2 Graceful Degradation (Continuar com outputs parciais)

**Quando usar:**
- Geração de múltiplos conceitos (5/10 conceitos OK → entregar 5)
- Batch processing (3/5 ângulos processados → entregar 3)

**Implementação:**
- Marcar outputs parciais com warning: `partial: true`
- Incluir razão da falha: `skipped_reason: "API timeout after 3 retries"`
- Notificar usuário: "Batch parcial entregue: 7/10 conceitos. 3 conceitos falharam (ver logs)."

---

### 3.3 Manual Intervention (Bloquear até correção)

**Quando usar:**
- Dados obrigatórios faltando (offer.yaml inválido)
- Compliance violation (claims ilegais)
- Auth/credential errors (API keys inválidos)

**Implementação:**
- BLOCK task execution
- Fornecer mensagem clara com NEXT STEPS:
  ```
  BLOCKED: Offer EXAMPLE01 missing required field 'icp.demographics.age_range'

  FIX: Edit data/offers/EXAMPLE01/offer.yaml and add:
  icp:
    demographics:
      age_range: "45-65"  # Example

  Then retry: *generate-creatives EXAMPLE01
  ```

---

## 4. Error Logging e Monitoring

### 4.1 Log Locations

| Tipo | Path | Formato |
|------|------|---------|
| **API errors** | `logs/api-errors-{timestamp}.jsonl` | JSONL (1 linha = 1 erro) |
| **Pipeline errors** | `logs/pipeline-errors-{timestamp}.yaml` | YAML |
| **Validation failures** | `logs/validation-failures-{timestamp}.md` | Markdown (human-readable) |
| **General task logs** | `logs/task-execution-{task-name}-{timestamp}.log` | Plain text |

### 4.2 Log Rotation

- Logs > 30 dias → auto-archive em `logs/archive/{year}/{month}/`
- Logs > 90 dias → auto-delete (opcional, config em squad.yaml)

### 4.3 Error Metrics (Futuro — v4.2+)

Track em `logs/metrics.json`:
```json
{
  "period": "2026-02-20 to 2026-02-27",
  "api_errors": {
    "dall-e": { "total": 12, "rate_limit": 8, "content_policy": 4 },
    "midjourney": { "total": 3, "timeout": 3 }
  },
  "validation_failures": {
    "compliance": 5,
    "quality": 2
  },
  "pipeline_errors": {
    "pre-condition-not-met": 1
  }
}
```

---

## 5. Task-Specific Error Handling

### 5.1 generate-images-api.md

**Errors específicos:**
- **DALL-E prompt too long (>4000 chars):** Truncar automaticamente, WARN usuário
- **Content policy rejection:** Tentar sanitizar (remover palavras sensíveis), retry 1x
- **Rate limit:** Retry com backoff (max 3x)
- **Timeout (>60s per image):** Skip conceito, continuar próximo

**Recovery:** Salvar conceitos já gerados, continuar de onde parou se retry.

---

### 5.2 review-compliance.md

**Errors específicos:**
- **Compliance rules file missing:** BLOCK com path esperado
- **Ambiguous rule (sem PERMITIDO/PROIBIDO claro):** WARN, pedir clarificação

**Recovery:** Nenhum — compliance é BLOQUEIO TOTAL até correção.

---

### 5.3 interpret-offer-data.md

**Errors específicos:**
- **Offer file não parse (YAML inválido):** BLOCK com linha do erro
- **Performance file ausente:** WARN + usar defaults (method distribution: 50/30/20)

**Recovery:** Fallback para valores default quando performance.yaml ausente.

---

## 6. User Communication

### 6.1 Error Message Format

**SEMPRE incluir:**
1. **O QUE falhou** (task/step específico)
2. **POR QUÊ falhou** (causa raiz)
3. **COMO corrigir** (next steps claros)

**Exemplo BOM:**
```
❌ BLOCKED: generate-image-concepts failed

WHY: Offer EXAMPLE01 missing compliance rules
EXPECTED: data/offers/EXAMPLE01/compliance/rules.md

FIX:
1. Copy template: cp data/offers/_example/compliance/rules.md data/offers/EXAMPLE01/compliance/
2. Edit rules for your offer's geos/platforms
3. Retry: *generate-creatives EXAMPLE01

HELP: See data/offers/_example/ for complete reference
```

**Exemplo RUIM:**
```
Error: File not found
```

---

### 6.2 Severity Levels

| Severity | Icon | Meaning | Action |
|----------|------|---------|--------|
| **CRITICAL** | 🔴 | Sistema não pode continuar | BLOCK execution |
| **ERROR** | ❌ | Task falhou, mas sistema OK | BLOCK task, suggest fix |
| **WARNING** | ⚠️ | Problema detectado, usando fallback | Continue com degradação |
| **INFO** | ℹ️ | Informação útil (não é erro) | Log only |

---

## 7. Testing Error Scenarios

### 7.1 Unit Tests (Futuro — v4.2+)

Testar cada categoria:
- Missing offer files
- Invalid YAML syntax
- API rate limits (mock)
- Compliance violations

### 7.2 Integration Tests

- Pipeline com pre-condition falhando
- API timeout recovery
- Partial batch delivery

---

## 8. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 4.0.1 | 2026-02-20 | Criado error handling strategy (pre-implementation) |

---

**Próximos passos (roadmap):**
- v4.1: Implementar retry logic em generate-images-api
- v4.2: Error metrics tracking
- v4.3: Auto-recovery de estados salvos (checkpoint/resume)
