import assert from 'node:assert/strict';

const auth = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const banco = 'http://127.0.0.1:8080/v1/projects/demo-lembretes/databases/(default)/documents';
const storage = 'http://127.0.0.1:9199/v0/b/demo-lembretes.appspot.com/o';

async function novaConta(nome) {
  const resposta = await fetch(`${auth}/accounts:signUp?key=demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${nome}@example.test`, password: 'senha-de-teste', returnSecureToken: true }),
  });
  assert.equal(resposta.status, 200, 'criar conta no emulador');
  return resposta.json();
}

function acessar(caminho, metodo, conta, dados) {
  const headers = { 'Content-Type': 'application/json' };
  if (conta) headers.Authorization = `Bearer ${conta.idToken}`;
  return fetch(`${banco}/${caminho}`, {
    method: metodo,
    headers,
    body: dados && JSON.stringify(dados),
  });
}

const [dona, outraConta] = await Promise.all([novaConta('dona'), novaConta('outra')]);
const colecao = `usuarios/${dona.localId}/lembretes`;
const documento = `${colecao}/teste`;
const dados = { fields: { titulo: { stringValue: 'Lembrete de teste' } } };

assert.equal((await acessar(documento, 'PATCH', dona, dados)).status, 200);
assert.equal((await acessar(documento, 'GET', dona)).status, 200);
assert.equal((await acessar(colecao, 'GET', dona)).status, 200);
assert.equal((await acessar(documento, 'GET', outraConta)).status, 403);
assert.equal((await acessar(colecao, 'GET', outraConta)).status, 403);
assert.equal((await acessar(documento, 'PATCH', outraConta, dados)).status, 403);
assert.equal((await acessar(documento, 'DELETE', outraConta)).status, 403);
assert.equal((await acessar(documento, 'GET')).status, 403);
assert.equal((await acessar(documento, 'DELETE', dona)).status, 200);
console.log('O Firestore permite acesso à conta dona e bloqueia terceiros.');

const pastaImagens = `${documento}/imagens`;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvz0AAAAASUVORK5CYII=', 'base64');

function cabecalhosStorage(conta) {
  return conta ? { Authorization: `Firebase ${conta.idToken}` } : {};
}

function subirImagem(nome, conta, contentType = 'image/png') {
  const boundary = 'verificacao-lembretes';
  const metadata = JSON.stringify({ name: nome, contentType });
  const inicio = `--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`;
  return fetch(`${storage}?name=${encodeURIComponent(nome)}`, {
    method: 'POST',
    headers: {
      ...cabecalhosStorage(conta),
      'X-Goog-Upload-Protocol': 'multipart',
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: Buffer.concat([Buffer.from(inicio), png, Buffer.from(`\r\n--${boundary}--`)]),
  });
}

async function temStatus(resposta, status, contexto) {
  assert.equal(resposta.status, status, `${contexto}: ${await resposta.text()}`);
}

const imagem = `${pastaImagens}/print`;
const urlImagem = `${storage}/${encodeURIComponent(imagem)}`;
await temStatus(await subirImagem(`${pastaImagens}/alheio`, outraConta), 403, 'upload por outra conta');
await temStatus(await subirImagem(`${pastaImagens}/texto`, dona, 'text/plain'), 403, 'upload fora de imagem');
await temStatus(await subirImagem(imagem, dona), 200, 'upload da dona');

const download = await fetch(`${urlImagem}?alt=media`, { headers: cabecalhosStorage(dona) });
assert.equal(download.status, 200, 'download da dona');
assert.deepEqual(Buffer.from(await download.arrayBuffer()), png, 'conteúdo baixado intacto');
await temStatus(await fetch(`${urlImagem}?alt=media`, { headers: cabecalhosStorage(outraConta) }), 403, 'download por outra conta');
await temStatus(await fetch(`${urlImagem}?alt=media`), 403, 'download sem conta');
await temStatus(await fetch(urlImagem, { method: 'DELETE', headers: cabecalhosStorage(outraConta) }), 403, 'exclusão por outra conta');
await temStatus(await fetch(urlImagem, { method: 'DELETE', headers: cabecalhosStorage(dona) }), 204, 'exclusão pela dona');
console.log('O Cloud Storage protege os anexos por conta e devolve os bytes originais.');
