---
task: adapt-vsl-cross-niche
responsavel: "@gary-halbert"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: production

pre-conditions:
  - condition: "Source VSL script exists"
    source: "User input"
    blocker: true
    validation: "Complete VSL script in source niche"
  - condition: "Target niche and product defined"
    source: "User input"
    blocker: true
    validation: "New product/niche with sufficient details"

post-conditions:
  - condition: "Translation table applied"
    validation: "All elements mapped from source to target niche"
    blocker: true
  - condition: "Script rewritten for new niche"
    validation: "Complete script adapted with new mechanism, proofs, results"
    blocker: true

Entrada:
  - source_script: "VSL script original"
  - source_niche: "Nicho de origem (nutra, infoproduto, SaaS, etc)"
  - target_niche: "Nicho alvo"
  - target_product: "Produto/oferta do nicho alvo"
Saida:
  - adapted_script: "VSL adaptado para o novo nicho"
  - translation_table: "Tabela de traducao dos conceitos"
Checklist:
  - "[ ] Mapear elementos-chave do script original"
  - "[ ] Criar tabela de traducao source → target"
  - "[ ] Reescrever mecanismo pro novo nicho"
  - "[ ] Substituir provas por equivalentes do nicho alvo"
  - "[ ] Ajustar linguagem e tom pro novo publico"
  - "[ ] Verificar compliance do novo nicho"
---

# Adapt VSL Cross-Niche — Traducao Entre Nichos (Halbert Method)

## Objetivo

Traduzir uma VSL de um nicho para outro mantendo a estrutura persuasiva, usando a tabela de traducao de conceitos.

## Tabela de Traducao Cross-Niche

| Elemento | Nutraceutico | Infoproduto | SaaS |
|----------|-------------|-------------|------|
| **Mecanismo** | Biologico ("ativa gene AMPK") | Comportamental ("metodo F.O.C.U.S.") | Tecnologico ("algoritmo X") |
| **Ingredientes** | Componentes da formula | Modulos/Frameworks do curso | Features do software |
| **Prova** | Estudos clinicos, papers | Case studies, resultados de alunos | Metricas, ROI, demos |
| **Resultado** | Fisico e mensuravel (kg, cm) | Abstrato e aspiracional (liberdade, renda) | Eficiencia e economia (tempo, dinheiro) |
| **Urgencia** | Estoque limitado, saude | Vagas limitadas, preco sobe | Trial expira, preco early-bird |
| **Garantia** | 30-90 dias devolucao | 30 dias ou modulo gratis | Free trial / cancel anytime |
| **Authority** | Medico, pesquisador | Autor, case study | CTO, empresa conhecida |

## Processo

1. **Desconstruir** o script original em elementos-chave
2. **Aplicar tabela** de traducao para o novo nicho
3. **Reescrever** cada bloco substituindo conceitos mapeados
4. **Adaptar tom** e linguagem pro novo publico
5. **Criar novas provas** relevantes ao nicho alvo
6. **Verificar** compliance do novo nicho
7. **Rodar self-review**

## Notas

- A ESTRUTURA persuasiva permanece identica (AIDA, greased slide, proof stacking)
- O que muda: mecanismo, provas, linguagem, tipo de resultado, urgencia
- Cross-niche BEM FEITO e como modelagem: mesma espinha dorsal, conteudo novo
