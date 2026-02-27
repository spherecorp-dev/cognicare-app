# Task: Transcribe and Process

## Metadata
- **id:** transcribe-and-process
- **version:** 1.0.0
- **agents:** [any]
- **elicit:** true
- **category:** utility

## Description
Transcreve audio/video e processa o conteudo conforme o objetivo do usuario.

## Inputs
- `source`: Caminho do arquivo local OU URL (YouTube, link direto)
- `objective`: (elicit) O que fazer com o transcript
- `lang`: (optional) Hint de idioma — default: auto

## Steps

### Step 1: Transcricao
```bash
node tools/transcribe.js "{source}" --lang {lang} --output outputs/transcripts
```
- Aguardar conclusao
- Capturar caminho do output

### Step 2: Elicit — Objetivo
```
O audio foi transcrito com sucesso.

O que voce quer que eu faca com o conteudo?

1. **Resumo executivo** — Pontos principais em formato conciso
2. **Documento de conhecimento** — Estruturado pra servir de referencia (salvo em docs/)
3. **Action items** — Lista de tarefas e decisoes extraidas
4. **Alimentar documento existente** — Extrair info relevante e adicionar a um doc especifico
5. **Guiar uma tarefa** — Usar o conteudo como contexto pra outra atividade
6. **Apenas o transcript** — Ja esta salvo, nada mais a fazer

> Voce pode combinar opcoes ou descrever algo diferente.
```

### Step 3: Processar conforme objetivo

**Se resumo executivo:**
- Ler transcript completo
- Gerar resumo com: principais pontos, decisoes, numeros/dados mencionados, proximos passos
- Salvar em `outputs/transcripts/{nome}-resumo.md`

**Se documento de conhecimento:**
- Ler transcript completo
- Estruturar com secoes, headers, bullet points
- Remover redundancias e linguagem conversacional
- Salvar em `docs/` no local apropriado
- Perguntar onde salvar se nao obvio

**Se action items:**
- Extrair todas as tarefas, decisoes e compromissos mencionados
- Formatar como checklist markdown
- Identificar responsaveis se mencionados
- Salvar em `outputs/transcripts/{nome}-actions.md`

**Se alimentar documento existente:**
- Elicit: qual documento?
- Ler documento alvo
- Ler transcript
- Identificar informacoes relevantes
- Sugerir edicoes ao documento (nao editar sem aprovacao)

**Se guiar tarefa:**
- Manter transcript como contexto
- Elicit: qual tarefa?
- Usar conteudo do transcript como input pra tarefa solicitada

**Se apenas transcript:**
- Informar caminho do arquivo salvo
- Encerrar

### Step 4: Output
- Confirmar com usuario que o resultado esta correto
- Informar todos os arquivos gerados

## Output
- Transcript salvo em `outputs/transcripts/`
- Documento processado conforme objetivo escolhido
