# Jarvis Voice UI — Dashboard Integration

## Story Info

| Campo | Valor |
|-------|-------|
| **Status** | Draft |
| **Epic** | Jarvis Evolution |
| **Prioridade** | High |
| **Complexidade** | L (Large) |
| **Agente** | @dev |

---

## Descrição

Integrar interface de voz no dashboard para comunicação direta com o Jarvis via browser. O CEO poderá falar com o Jarvis por voz, receber respostas em texto e áudio, e utilizar todas as capacidades do Jarvis (brief, delegate, assess, prioritize, monitor) através de uma interface dedicada.

---

## Arquitetura

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Dashboard)                                     │
│                                                          │
│  [Mic Button] → MediaRecorder API → audio blob          │
│       ↓                                                  │
│  POST /api/jarvis/transcribe  ←── Whisper STT           │
│       ↓                                                  │
│  POST /api/jarvis/chat        ←── Claude API (streaming) │
│       ↓                                                  │
│  POST /api/jarvis/speak       ←── OpenAI TTS            │
│       ↓                                                  │
│  Audio() playback ← mp3 response                        │
└─────────────────────────────────────────────────────────┘
```

### Stack

| Camada | Tecnologia | Notas |
|--------|-----------|-------|
| Audio Capture | Web Audio API + MediaRecorder | webm/opus format |
| STT | OpenAI Whisper API | whisper-1, language=pt |
| LLM | Anthropic Claude API | Sonnet para velocidade, persona Jarvis |
| TTS | OpenAI TTS API | tts-1, voice=onyx, mp3 |
| Frontend | Next.js 16 + React 19 + shadcn/ui | Já existente |
| State | zustand + @tanstack/react-query | Já existente |

---

## API Endpoints

### POST /api/jarvis/transcribe

Recebe áudio, retorna texto transcrito.

```typescript
// Request: multipart/form-data
// Body: file (audio blob), language? (default: "pt")

// Response: 200
{ text: string; language: string; duration: number }
```

Internamente chama o WhisperClient existente em `.aios-core/core/integrations/whisper/client.js` ou direto na API do OpenAI.

### POST /api/jarvis/chat

Envia mensagem para o Jarvis, retorna resposta em streaming (SSE).

```typescript
// Request: application/json
{
  messages: { role: "user" | "assistant"; content: string }[];
  command?: string; // *brief, *delegate, *assess, etc.
}

// Response: text/event-stream (SSE)
data: {"type": "text", "content": "Senhor, ..."}
data: {"type": "text", "content": "o status atual..."}
data: {"type": "done", "fullText": "Senhor, o status atual..."}
```

System prompt do Jarvis carregado server-side a partir de `.aios-core/development/agents/jarvis.md` (versão condensada para voz).

### POST /api/jarvis/speak

Recebe texto, retorna áudio MP3.

```typescript
// Request: application/json
{ text: string; voice?: string } // default voice: "onyx"

// Response: audio/mpeg (binary stream)
```

---

## Componentes UI

### 1. JarvisPage (`/app/jarvis/page.tsx`)

Página dedicada do Jarvis — NÃO é o chat genérico.

```
┌──────────────────────────────────────────┐
│  🤖 Jarvis                     [⚙️]     │
│─────────────────────────────────────────│
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  Transcript / Conversation Area   │  │
│  │                                    │  │
│  │  Jarvis: Bom dia, senhor.         │  │
│  │  Estou ouvindo.                   │  │
│  │                                    │  │
│  │  Você: Qual o status dos          │  │
│  │  projetos?                        │  │
│  │                                    │  │
│  │  Jarvis: Senhor, o SOE está com   │  │
│  │  18/18 stories completas...       │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  [💬 texto...]          [🎙️] [📤] │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Quick Commands:                         │
│  [📋 Brief] [📌 Delegate] [📊 Assess]  │
│  [🎯 Prioritize] [👁️ Monitor]          │
│                                          │
└──────────────────────────────────────────┘
```

### 2. JarvisVoiceButton (`/components/jarvis/voice-button.tsx`)

Botão de microfone com 4 estados visuais:

| Estado | Visual | Ação |
|--------|--------|------|
| `idle` | Mic icon cinza | Click → inicia gravação |
| `recording` | Mic icon vermelho + pulse animation | Click → para gravação |
| `processing` | Spinner | Aguardando transcrição + resposta |
| `speaking` | Sound wave animation | Jarvis está falando |

```typescript
interface VoiceButtonProps {
  state: 'idle' | 'recording' | 'processing' | 'speaking';
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancel: () => void;
}
```

### 3. JarvisTranscript (`/components/jarvis/transcript.tsx`)

Área de conversa com mensagens estilizadas para voz:

- Mensagens do usuário: alinhadas à direita, com badge "Voz" ou "Texto"
- Mensagens do Jarvis: alinhadas à esquerda, com avatar 🤖
- Streaming: texto aparece progressivamente (SSE)
- Botão de replay áudio em cada mensagem do Jarvis

### 4. JarvisQuickCommands (`/components/jarvis/quick-commands.tsx`)

Atalhos para os comandos mais usados:

```typescript
const QUICK_COMMANDS = [
  { label: 'Brief', command: '*brief', icon: 'ClipboardList' },
  { label: 'Delegate', command: '*delegate', icon: 'UserPlus' },
  { label: 'Assess', command: '*assess', icon: 'BarChart3' },
  { label: 'Prioritize', command: '*prioritize', icon: 'Target' },
  { label: 'Monitor', command: '*monitor', icon: 'Eye' },
];
```

### 5. JarvisAudioPlayer (hook: `useJarvisAudio`)

Hook para gerenciar gravação e playback:

```typescript
function useJarvisAudio() {
  return {
    // Recording
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob>;
    isRecording: boolean;
    recordingDuration: number;

    // Playback
    playAudio: (audioBlob: Blob) => Promise<void>;
    stopAudio: () => void;
    isPlaying: boolean;

    // Permissions
    hasPermission: boolean;
    requestPermission: () => Promise<boolean>;
  };
}
```

---

## UX Flow Detalhado

### Flow 1: Conversa por Voz

1. Usuário clica no botão 🎙️ (ou tecla de atalho)
2. Browser pede permissão de microfone (primeira vez)
3. Botão muda para vermelho com pulse → `recording`
4. Waveform/timer mostra duração
5. Usuário clica novamente → para gravação
6. Botão muda para spinner → `processing`
7. Audio blob → POST /api/jarvis/transcribe
8. Texto transcrito aparece na conversa (lado do usuário)
9. Texto → POST /api/jarvis/chat (streaming)
10. Resposta aparece progressivamente na conversa (lado do Jarvis)
11. Quando streaming completo → POST /api/jarvis/speak
12. Botão muda para waves → `speaking`
13. Áudio toca automaticamente
14. Ao terminar → botão volta para `idle`

### Flow 2: Conversa por Texto

1. Usuário digita no input de texto
2. Envia com Enter ou botão 📤
3. Texto → POST /api/jarvis/chat (streaming)
4. Resposta aparece + áudio toca automaticamente
5. (Pode desabilitar áudio automático nas configurações)

### Flow 3: Quick Command

1. Usuário clica em "Brief"
2. Equivale a enviar "*brief" no chat
3. Jarvis processa e responde com briefing
4. Áudio toca automaticamente

---

## Modelo de Estado (Zustand)

```typescript
interface JarvisState {
  // Conversation
  messages: JarvisMessage[];
  isStreaming: boolean;

  // Voice
  voiceState: 'idle' | 'recording' | 'processing' | 'speaking';
  autoPlayAudio: boolean;

  // Settings
  ttsVoice: string;      // OpenAI voice ID
  ttsEnabled: boolean;
  sttLanguage: string;    // default: 'pt'

  // Actions
  sendMessage: (text: string) => Promise<void>;
  sendVoice: (audioBlob: Blob) => Promise<void>;
  sendCommand: (command: string) => Promise<void>;
  clearHistory: () => void;
  setAutoPlayAudio: (enabled: boolean) => void;
}
```

---

## Considerações Técnicas

### Permissões do Browser
- `navigator.mediaDevices.getUserMedia({ audio: true })` requer HTTPS ou localhost
- Mostrar mensagem clara se permissão for negada
- Salvar estado da permissão para não perguntar repetidamente

### Audio Format
- MediaRecorder grava em `audio/webm;codecs=opus` (Chrome/Edge) ou `audio/mp4` (Safari)
- Whisper aceita webm diretamente — sem necessidade de conversão
- Fallback: se MediaRecorder não suportar webm, usar wav via Web Audio API

### Streaming
- Usar SSE (Server-Sent Events) para streaming do Claude
- O pattern já existe em `/app/chat/page.tsx` com `ReadableStream`
- Adaptar para o formato de eventos do Jarvis

### Latência
- Whisper: ~1-3s para áudios curtos
- Claude (Sonnet): ~2-5s para respostas curtas
- TTS: ~1-2s para gerar + download
- **Total esperado: 4-10s** do fim da fala até ouvir resposta

### Otimizações Futuras
- [ ] Streaming TTS (começar a falar antes de terminar de gerar)
- [ ] VAD (Voice Activity Detection) para parar gravação automaticamente
- [ ] Wake word ("Jarvis,...") para iniciar sem clicar
- [ ] Cache de TTS para saudações comuns
- [ ] WebSocket em vez de SSE para menor latência

---

## Acceptance Criteria

- [ ] Página `/jarvis` acessível no dashboard
- [ ] Gravação de voz funciona no Chrome, Safari e Firefox
- [ ] Transcrição via Whisper retorna texto correto em PT-BR
- [ ] Respostas do Jarvis aparecem em streaming (progressivo)
- [ ] TTS reproduz resposta em áudio automaticamente
- [ ] Quick commands (brief, delegate, assess, prioritize, monitor) funcionam
- [ ] Input de texto funciona como alternativa à voz
- [ ] Histórico de conversa persiste durante a sessão
- [ ] Botão de voz mostra estados visuais corretos (idle/recording/processing/speaking)
- [ ] Graceful degradation se mic não disponível (modo texto-only)
- [ ] Funciona em HTTPS (produção) e localhost (dev)

---

## Scope

### IN
- Página dedicada do Jarvis com interface de voz
- Integração STT (Whisper) + LLM (Claude) + TTS (OpenAI)
- Quick commands para workflows Jarvis
- Modo texto como fallback/alternativa
- Streaming de respostas

### OUT
- Integração com módulos Jarvis server-side (business memory, delegation store, etc.) — será fase seguinte
- Wake word detection
- Múltiplas línguas (apenas PT-BR por agora)
- Histórico persistente entre sessões
- Push notifications / alertas proativos

---

## Dependências

| Tipo | Recurso | Status |
|------|---------|--------|
| API Key | OPENAI_API_KEY (Whisper + TTS) | Existente |
| API Key | ANTHROPIC_API_KEY (Claude) | Existente |
| Infra | WhisperClient | Existente em `.aios-core/core/integrations/whisper/client.js` |
| Persona | Jarvis system prompt | Existente em `.aios-core/development/agents/jarvis.md` |
| UI | shadcn/ui components | Existente no dashboard |
| Reference | Protótipo terminal | `.aios-core/prototypes/jarvis-voice/jarvis-voice.js` |

---

## Estimativa de Implementação

| Componente | Esforço |
|-----------|---------|
| API routes (transcribe, chat, speak) | 1-2 dias |
| useJarvisAudio hook | 1 dia |
| JarvisPage + layout | 1-2 dias |
| VoiceButton + estados | 0.5 dia |
| Transcript + streaming | 1 dia |
| QuickCommands | 0.5 dia |
| Zustand store | 0.5 dia |
| Testes + polish | 1-2 dias |
| **Total** | **~6-9 dias** |

---

## File List

| Arquivo | Ação |
|---------|------|
| `dashboard/src/app/jarvis/page.tsx` | CREATE |
| `dashboard/src/app/api/jarvis/transcribe/route.ts` | CREATE |
| `dashboard/src/app/api/jarvis/chat/route.ts` | CREATE |
| `dashboard/src/app/api/jarvis/speak/route.ts` | CREATE |
| `dashboard/src/components/jarvis/voice-button.tsx` | CREATE |
| `dashboard/src/components/jarvis/transcript.tsx` | CREATE |
| `dashboard/src/components/jarvis/quick-commands.tsx` | CREATE |
| `dashboard/src/hooks/use-jarvis-audio.ts` | CREATE |
| `dashboard/src/stores/jarvis-store.ts` | CREATE |
| `dashboard/src/types/jarvis.ts` | CREATE |
| `dashboard/src/types/squad.ts` | MODIFY (adicionar Jarvis agent) |

---

## Metadata

```yaml
story: jarvis-voice-ui
version: 1.0.0
tags:
  - jarvis
  - voice
  - dashboard
  - ui
  - whisper
  - tts
created_at: 2026-02-21
```
