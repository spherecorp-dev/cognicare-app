# Swipe Files — Convencoes e Estrutura

> Diretorio de swipe files organizados por agente/estilo.
> Cada agente de copy tem seu proprio swipe file com exemplos concretos para modelagem.

## Convencao de Nomes

```
swipe-files/
  _index.md                  # Este arquivo
  {nome-do-expert}.md        # Um arquivo por expert/estilo clonado
```

## Como Adicionar um Novo Swipe File

1. Criar `{nome-do-expert}.md` nesta pasta
2. Seguir a estrutura padrao (ver stefan-georgi.md como referencia):
   - Metadata (expert, agente, vertical, geo)
   - Hooks (organizados por tipo)
   - Primary Texts / Ad Copy (organizados por writing format)
   - Headlines
   - Mechanisms (nomes sensoriais)
   - CTAs
3. Todos os exemplos devem ter: exemplo + analise (por que funciona)
4. Referenciar o swipe file no agente correspondente em `dependencies.data`

## Swipe Files Ativos

| Arquivo | Expert | Agente | Verticais |
|---------|--------|--------|-----------|
| stefan-georgi.md | Stefan Georgi | @stefan-georgi | Saude, Nutra, Emagrecimento |

## Recursos Compartilhados (Cross-Agent)

| Arquivo | Descricao | Localização |
|---------|-----------|-------------|
| fascination-library.md | Biblioteca de fascinations por vertical | `../fascination-library.md` |
| winners-library.md | Winners historicos validados | `../winners-library.md` |
| geo-cultural-guide.md | Adaptacao cultural por geo | `../geo-cultural-guide.md` |

---
*Mantido por @squad-creator (Craft)*
