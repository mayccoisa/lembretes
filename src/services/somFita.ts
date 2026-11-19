/**
 * Efeitos sonoros sintetizados via Web Audio API (zero arquivos de audio externos).
 * Simula o deslizar suave da fita de cetim e o estalo leve do no se soltando.
 */

let contextoAudio: AudioContext | null = null;

function obterContexto(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!contextoAudio) {
    contextoAudio = new Ctx();
  }
  if (contextoAudio.state === 'suspended') {
    void contextoAudio.resume();
  }
  return contextoAudio;
}

export function tocarSomDesatar(habilitado: boolean): void {
  if (!habilitado) return;
  const ctx = obterContexto();
  if (!ctx) return;

  const agora = ctx.currentTime;

  // 1. Sopro sedoso da fita deslizando (ruido filtrado curto)
  const duracaoRuido = 0.28;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duracaoRuido), ctx.sampleRate);
  const canal = buffer.getChannelData(0);
  for (let i = 0; i < canal.length; i++) {
    const env = Math.sin((i / canal.length) * Math.PI);
    canal[i] = (Math.random() * 2 - 1) * env * 0.16;
  }
  const fonteRuido = ctx.createBufferSource();
  fonteRuido.buffer = buffer;

  const filtro = ctx.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.frequency.setValueAtTime(900, agora);
  filtro.frequency.exponentialRampToValueAtTime(2400, agora + duracaoRuido);
  filtro.Q.value = 2.2;

  const ganhoRuido = ctx.createGain();
  ganhoRuido.gain.setValueAtTime(0.001, agora);
  ganhoRuido.gain.exponentialRampToValueAtTime(0.22, agora + 0.08);
  ganhoRuido.gain.exponentialRampToValueAtTime(0.001, agora + duracaoRuido);

  fonteRuido.connect(filtro);
  filtro.connect(ganhoRuido);
  ganhoRuido.connect(ctx.destination);
  fonteRuido.start(agora);

  // 2. Dois tons leves e alegres quando o laco solta o no
  const notas = [
    { freq: 523.25, inicio: 0.16, duracao: 0.14 },
    { freq: 783.99, inicio: 0.26, duracao: 0.22 },
  ];

  for (const n of notas) {
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(n.freq, agora + n.inicio);
    osc.frequency.exponentialRampToValueAtTime(n.freq * 1.03, agora + n.inicio + n.duracao);

    ganho.gain.setValueAtTime(0.001, agora + n.inicio);
    ganho.gain.exponentialRampToValueAtTime(0.14, agora + n.inicio + 0.02);
    ganho.gain.exponentialRampToValueAtTime(0.001, agora + n.inicio + n.duracao);

    osc.connect(ganho);
    ganho.connect(ctx.destination);
    osc.start(agora + n.inicio);
    osc.stop(agora + n.inicio + n.duracao + 0.02);
  }
}

export function tocarSomAmarrar(habilitado: boolean): void {
  if (!habilitado) return;
  const ctx = obterContexto();
  if (!ctx) return;

  const agora = ctx.currentTime;
  const osc = ctx.createOscillator();
  const ganho = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, agora);
  osc.frequency.exponentialRampToValueAtTime(587.33, agora + 0.09);

  ganho.gain.setValueAtTime(0.001, agora);
  ganho.gain.exponentialRampToValueAtTime(0.1, agora + 0.015);
  ganho.gain.exponentialRampToValueAtTime(0.001, agora + 0.1);

  osc.connect(ganho);
  ganho.connect(ctx.destination);
  osc.start(agora);
  osc.stop(agora + 0.11);
}
