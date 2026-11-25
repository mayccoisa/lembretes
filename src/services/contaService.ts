import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

export interface ContaLembretes {
  uid: string;
  email: string | null;
}

export const usarEmulador = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULADOR === 'true';
const projectId = usarEmulador ? 'demo-lembretes' : import.meta.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = usarEmulador ? 'demo-lembretes' : import.meta.env.VITE_FIREBASE_API_KEY;

const app = projectId && apiKey ? initializeApp({
  projectId, apiKey, authDomain: `${projectId}.firebaseapp.com`,
  storageBucket: usarEmulador ? 'demo-lembretes.appspot.com' : `${projectId}.firebasestorage.app`,
}) : null;
const auth = app ? getAuth(app) : null;

if (auth && usarEmulador) connectAuthEmulator(auth, 'http://127.0.0.1:9099');

function obterAuth() {
  if (!auth) throw new Error('A conexão de conta ainda não está disponível nesta versão.');
  return auth;
}

export function obterAppDaConta(uid: string) {
  const sessao = obterAuth();
  if (sessao.currentUser?.uid !== uid) throw new Error('A conta foi desconectada.');
  return sessao.app;
}

export function observarConta(aoMudar: (conta: ContaLembretes | null) => void) {
  return onAuthStateChanged(obterAuth(), (usuario) => {
    aoMudar(usuario ? { uid: usuario.uid, email: usuario.email } : null);
  });
}

export async function entrarNaConta(email: string, senha: string) {
  await signInWithEmailAndPassword(obterAuth(), email, senha);
}

export async function criarConta(email: string, senha: string) {
  await createUserWithEmailAndPassword(obterAuth(), email, senha);
}

export function redefinirSenha(email: string) {
  return sendPasswordResetEmail(obterAuth(), email);
}

export function sairDaConta() {
  return signOut(obterAuth());
}
