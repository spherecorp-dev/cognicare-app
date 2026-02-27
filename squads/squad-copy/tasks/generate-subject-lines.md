---
task: generate-subject-lines
responsavel: "@ben-settle"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: production

pre-conditions:
  - condition: "Email content or topic defined"
    source: "User input or email body"
    blocker: true
    validation: "Topic, angle, or full email body available"

post-conditions:
  - condition: "Subject lines create curiosity"
    validation: "No subject line reveals email content"
    blocker: true
  - condition: "Multiple variants provided"
    validation: "At least 10 variants per email"
    blocker: false

Entrada:
  - email_body: "Corpo do email (opcional — se disponivel, gerar SL especifica)"
  - topic: "Topico do email (se body nao disponivel)"
  - vertical: "nutra | infoproduto | saas"
  - quantity: "Numero de subject lines (default: 10)"
  - style: "curiosity | cultural_ref | blatant | question | number (opcional)"
Saida:
  - subject_lines: "Lista rankeada de subject lines"
  - rationale: "Justificativa por subject line"
Checklist:
  - "[ ] NUNCA revelar conteudo do email na subject line"
  - "[ ] Curiosidade como driver principal"
  - "[ ] Variar estilos (how, secret, cultural ref, question)"
  - "[ ] Manter curtas e intrigantes"
  - "[ ] Verificar compliance (nao enganosas)"
---

# Generate Subject Lines — Subject Lines de Alta Abertura (Ben Settle Method)

## Objetivo

Gerar subject lines que criam curiosidade irresistivel sem revelar o conteudo do email. Baseado na analise de 2.684+ emails de Ben Settle.

## Regra de Ouro

**NUNCA revelar o conteudo do email na subject line.**
A subject line tem UM trabalho: fazer a pessoa ABRIR o email. Nada mais.

## Patterns de Subject Line

### 1. How-To (mais usada — 400x)
```
How to [resultado desejado]
How [nome] [resultado]
How to [resultado] without [sacrificio]
```

### 2. Secret (99x)
```
The [referencia cultural] secret to [resultado]
The secret [profissao] use to [resultado]
A little-known secret about [topico]
```

### 3. Blatant (22x)
```
Blatant sales pitch for [produto]
Shameless plug for [produto]
This is an ad for [produto]
```

### 4. Cultural Reference
```
The [Personagem de Filme] way to [resultado]
What [Celebridade] taught me about [topico]
The [Serie/Filme] email marketing lesson
```

### 5. Question
```
[Pergunta intrigante que nao revela resposta]?
Why do [grupo] always [comportamento]?
What happens when [cenario inesperado]?
```

### 6. Number/Specificity
```
[Numero especifico] [resultado]
The [numero]-minute [metodo]
[Numero] reasons to [acao]
```

### 7. Contrarian
```
Why [crenca popular] is dead wrong
The [topico] lie everyone believes
Stop [acao convencional] immediately
```

### 8. Elbenbo/Personal
```
[Referencia pessoal ou auto-deprecativa]
My embarrassing [topico] confession
The dumbest thing I ever did with [topico]
```

## Estatisticas Reais (2.684 Emails)

- **Top palavras**: How (400x), Email (275x), Sales (114x), Get (113x), Marketing (107x), Secret (99x)
- **292 subject lines duplicadas** com sucesso (~1 ano depois)
- **426 reenvios** — quase sempre com MAIS vendas que o original
- "When I do 'encore' emails 99.9% of people never even realize it"

## Processo

1. Ler o corpo do email (ou topico)
2. Identificar o GANCHO mais intrigante
3. Gerar 10+ variantes usando diferentes patterns
4. Rankear por nivel de curiosidade
5. Verificar que NENHUMA revela o conteudo

## Anti-Patterns (NUNCA fazer)

- Revelar o conteudo do email
- Subject lines genericas ("Newsletter #47")
- Clickbait sem entregar no corpo
- ALL CAPS excessivo
- Emojis excessivos
- Subject lines que soam como spam
