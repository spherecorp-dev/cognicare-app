---
task: adapt-email-to-vertical
responsavel: "@ben-settle"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: production

pre-conditions:
  - condition: "Source email(s) exist"
    source: "User input"
    blocker: true
    validation: "Complete email(s) in source vertical"
  - condition: "Target vertical defined"
    source: "User input"
    blocker: true
    validation: "Valid target: nutra | infoproduto | saas"

post-conditions:
  - condition: "Adaptation table applied"
    validation: "All elements mapped from source to target vertical"
    blocker: true
  - condition: "Emails rewritten for target vertical"
    validation: "Tone, personality, compliance adapted"
    blocker: true

Entrada:
  - source_emails: "Email(s) original(is)"
  - source_vertical: "Vertical de origem (nutra | infoproduto | saas)"
  - target_vertical: "Vertical alvo"
  - target_offer: "Produto/oferta do vertical alvo"
Saida:
  - adapted_emails: "Emails adaptados para o vertical alvo"
  - adaptation_table: "Tabela de adaptacao dos conceitos"
Checklist:
  - "[ ] Mapear elementos-chave dos emails originais"
  - "[ ] Criar tabela de adaptacao source → target"
  - "[ ] Adaptar tom e personalidade pro vertical alvo"
  - "[ ] Substituir exemplos e analogias"
  - "[ ] Ajustar repulsion targets pro novo nicho"
  - "[ ] Verificar compliance do vertical alvo"
  - "[ ] Rodar self-review (10 checks)"
---

# Adapt Email to Vertical — Adaptacao Entre Verticais (Ben Settle Method)

## Objetivo

Adaptar emails de um vertical para outro mantendo os principios Settle (infotainment, personalidade, venda em cada email) mas ajustando tom, analogias, repulsion targets e compliance.

## Tabela de Adaptacao por Vertical

| Elemento | Nutra | Infoproduto | SaaS |
|----------|-------|-------------|------|
| **Tom** | Amigo que entende de saude | Mentor que ja passou por isso | Amigo tech-savvy |
| **Personalidade** | Caloroso, empático, health-aware | Controverso, opinativo, polarizante | Util, inteligente, acessivel |
| **Repulsion Target** | Big pharma, medicos tradicionais | Gurus, preguicosos, swipers | Ferramentas complicadas, over-engineering |
| **Storytelling** | Historias de transformacao fisica | Historias de sucesso/fracasso profissional | Historias de produtividade/eficiencia |
| **Social Proof** | "Maria, 54, perdeu..." | "Joao faturou R$..." | "Empresa X reduziu 40%..." |
| **CTA** | "Clique aqui pra ver o produto" | "Acesse o treinamento" | "Comece seu trial gratis" |
| **Urgencia** | Estoque, promocao sazonal | Vagas, preco sobe, bonus expira | Trial, early-bird, feature exclusiva |
| **Compliance** | Rigoroso (nunca claims de cura) | Moderado (income disclosure) | Flexivel (foco em features) |
| **Fascinations** | Ingredientes, mecanismos de saude | Metodos, frameworks, resultados | Features, integrações, ROI |
| **Open Loops** | "Amanha vou revelar o ingrediente..." | "Amanha compartilho o metodo..." | "Amanha mostro o hack..." |

## Processo

1. **Desconstruir** os emails originais em elementos-chave
2. **Aplicar tabela** de adaptacao para o vertical alvo
3. **Reescrever** ajustando tom, analogias e exemplos
4. **Adaptar repulsion targets** pro novo nicho
5. **Verificar compliance** do vertical alvo
6. **Rodar self-review** (10 checks)

## Regras de Adaptacao

- A ESTRUTURA do email permanece identica (subject → opening → body → CTA)
- O PRINCIPIO permanece identico (infotainment, standalone, personalidade)
- O que muda: tom, analogias, exemplos, repulsion targets, compliance
- **"The Settle system is not about being a smart ass. It's about matching your message to your market."**

## Exemplos de Adaptacao

### Email Tipo 2 (Storytelling) — Nutra → Info

**Nutra (original):**
```
SUBJECT: The Rocky Balboa secret to losing belly fat

Remember that scene where Rocky runs up the stairs in Philadelphia?

Well, there's a real-life equivalent happening inside your body right now...
[historia sobre metabolismo → link pro suplemento]
```

**Info (adaptado):**
```
SUBJECT: The Rocky Balboa secret to landing clients

Remember that scene where Rocky runs up the stairs in Philadelphia?

Well, there's a real-life equivalent happening in your business right now...
[historia sobre persistencia em vendas → link pro curso]
```

## Notas

- O 7 tipos de email funcionam em QUALQUER vertical
- Ajustar a INTENSIDADE da polarizacao (nutra=moderada, info=alta, saas=baixa)
- Compliance e o principal diferenciador — nutra e MUITO mais rigoroso
