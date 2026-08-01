/**
 * Service worker mínimo — existe para o app ser instalável no celular.
 *
 * DE PROPÓSITO não guarda nada de dado financeiro: nada de HTML de página,
 * nada de resposta do Supabase, nada de rota de auth. Um cache desses
 * mostraria saldo velho para quem abrisse o app, e deixaria dado de vocês
 * parado no disco do aparelho.
 *
 * Cacheia só o que é público e imutável: os bundles com hash do Next e os
 * ícones. É o suficiente para o app abrir rápido.
 */
const CACHE = "financas-casal-estatico-v1";

const IMUTAVEL = [/^\/_next\/static\//, /^\/icons\//, /^\/icon\.svg$/];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Só o próprio site. Supabase e qualquer outra origem passam direto.
  if (url.origin !== self.location.origin) return;

  const cacheavel = IMUTAVEL.some((re) => re.test(url.pathname));
  if (!cacheavel) return; // páginas e dados: sempre da rede, sem cache.

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((resposta) => {
        if (resposta.ok && resposta.type === "basic") {
          const copia = resposta.clone();
          caches.open(CACHE).then((c) => c.put(request, copia));
        }
        return resposta;
      });
    }),
  );
});
