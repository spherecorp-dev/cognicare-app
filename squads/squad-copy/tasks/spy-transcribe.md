---
task: spy-transcribe
responsavel: null
responsavel_type: task_pura
atomic_layer: task
elicit: false
squad: squad-copy
phase: 1-intelligence
Entrada:
  - raw_media: "Videos baixados pelo spy-scrape"
  - spy_manifest: "Indice dos arquivos"
Saida:
  - raw_transcripts: "Transcricoes brutas com timestamps e qualidade"
Checklist:
  - "[ ] Receber videos do spy-scrape"
  - "[ ] Transcrever cada video com Whisper"
  - "[ ] Detectar idioma automaticamente"
  - "[ ] Marcar qualidade da transcricao"
  - "[ ] Salvar transcricoes com timestamps"
  - "[ ] Atualizar manifest com info de transcricao"
---

# Spy Transcribe — Transcricao de Videos com Whisper

## Objetivo

Transcrever todos os videos baixados pelo spy-scrape usando Whisper. Gerar transcricoes com timestamps e marcacao de qualidade para processamento pelo spy-reconstruct-copy.

## Por que task pura?

E processamento mecanico: enviar audio para Whisper, receber texto. Sem julgamento — a limpeza e reconstrucao ficam com spy-reconstruct-copy.

## Nota de Integracao

**Whisper sera integrado pelo @dev.** Opcoes:
- **Whisper API (OpenAI)** — Cloud, rapido, pago por minuto
- **Whisper local** — Self-hosted, mais barato, precisa de GPU
- **Whisper.cpp** — Leve, roda em CPU, qualidade boa

## Processo

### 1. Filtrar Videos do Manifest

Do spy-manifest.yaml, selecionar apenas arquivos com `type: video`.

### 2. Transcrever Cada Video

Para cada video:
1. Extrair audio (se necessario — mp4 → wav)
2. Enviar para Whisper
3. Receber transcricao com timestamps (segments)
4. Detectar idioma (Whisper faz automaticamente)
5. Avaliar qualidade da transcricao

### 3. Avaliar Qualidade

```yaml
quality_levels:
  clean:
    description: "Transcricao clara, pouco ruido, confiavel"
    signal: "< 5% de palavras incertas"
    action: "Usar diretamente"
  noisy:
    description: "Ruido de fundo, musica baixa, algumas palavras perdidas"
    signal: "5-20% de palavras incertas"
    action: "Usar com cautela, marcar trechos incertos"
  music_heavy:
    description: "Musica alta, pouca voz, ou voz sobrecarregada por audio"
    signal: "> 20% incerto ou pouca voz detectada"
    action: "Transcricao pouco confiavel — focar em analise visual"
  no_speech:
    description: "Sem fala detectada (video so com musica/efeitos)"
    signal: "Whisper retorna vazio ou < 5 palavras"
    action: "Pular transcricao — ir direto para analise visual"
```

### 4. Formato de Output

```yaml
# transcript-video-001.yaml
source:
  file: "meta/video-001.mp4"
  platform: meta
  spy_run: "{timestamp}"
  duration_seconds: 32

transcription:
  language_detected: "fr"
  confidence: 0.94              # Confianca media do Whisper
  quality: "clean"              # clean | noisy | music_heavy | no_speech
  model_used: "whisper-large-v3"

  full_text: |
    Saviez-vous que le miel peut faire bien plus que sucrer votre thé?
    Des chercheurs de l'Université d'Oxford ont découvert qu'un composé
    naturel présent dans certains miels peut aider à restaurer la mémoire
    chez les adultes de plus de 50 ans. Cette méthode ancestrale...
    Découvrez comment en cliquant sur le lien ci-dessous.

  segments:
    - start: 0.0
      end: 3.2
      text: "Saviez-vous que le miel peut faire bien plus que sucrer votre thé?"
      confidence: 0.97
    - start: 3.2
      end: 7.8
      text: "Des chercheurs de l'Université d'Oxford ont découvert qu'un composé"
      confidence: 0.93
    - start: 7.8
      end: 12.1
      text: "naturel présent dans certains miels peut aider à restaurer la mémoire"
      confidence: 0.95
    - start: 12.1
      end: 16.4
      text: "chez les adultes de plus de 50 ans."
      confidence: 0.96
    - start: 16.4
      end: 20.0
      text: "Cette méthode ancestrale..."
      confidence: 0.91
    - start: 27.5
      end: 32.0
      text: "Découvrez comment en cliquant sur le lien ci-dessous."
      confidence: 0.98

  uncertain_segments: []          # Segments com confianca < 0.7

processing:
  transcription_time_seconds: 4.2
  processed_at: "{timestamp}"
```

### 5. Batch Processing

```yaml
# transcription-report.yaml
batch:
  spy_run: "{timestamp}"
  total_videos: 28
  total_transcribed: 25
  skipped:
    no_speech: 2
    error: 1
  quality_distribution:
    clean: 18
    noisy: 5
    music_heavy: 2
    no_speech: 2
  languages_detected:
    fr: 15
    en: 8
    es: 2
  total_processing_time: "3m 42s"
  average_per_video: "8.9s"
```

## Importante

- Transcricao BRUTA — nao limpar nem reestruturar aqui
- A limpeza e reconstrucao ficam com `spy-reconstruct-copy` (@copy-chief)
- Videos com `quality: no_speech` vao direto para analise visual no reconstruct
- Manter timestamps — uteis para identificar hook (primeiros 3s)
- Nao descartar videos com `quality: music_heavy` — podem ter texto overlay util

## Proximo Passo

Transcricoes brutas vao para `spy-reconstruct-copy` (@copy-chief) junto com imagens do spy-scrape.
