# Colocar o app no ar

Três passos. O único que só você pode fazer é o login nas contas.

## 1. Aplicar o schema no Supabase

Abra o [SQL Editor](https://supabase.com/dashboard/project/gkwabherhubezdmpkrzf/sql/new),
cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.

Para copiar o arquivo inteiro **no PowerShell** (não no SQL Editor):

```bash
Get-Content "C:\Users\ggarc\Projetos\financas-casal\supabase\schema.sql" -Raw | Set-Clipboard
```

Depois, em **Authentication → Providers → Email**, desligue *Confirm email*
enquanto vocês dois se cadastram. Ligue de novo quando terminarem.

Conferir se deu certo — deve listar as tabelas:

```bash
node -e "fetch('https://gkwabherhubezdmpkrzf.supabase.co/rest/v1/couples?select=id&limit=1',{headers:{apikey:process.env.K}}).then(r=>console.log(r.status===200?'schema OK':'faltou rodar o SQL ('+r.status+')'))"
```

## 2. Publicar na Vercel

```bash
npx vercel login
```

Depois, na pasta do projeto:

```bash
npx vercel --prod
```

Aceite os padrões (framework Next.js é detectado sozinho). No fim ele imprime
a URL pública.

## 3. Configurar as variáveis de ambiente

As chaves do `.env.local` **não** sobem com o deploy — precisam ser
cadastradas na Vercel:

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
```

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

Valores (os mesmos do `.env.local`):

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://gkwabherhubezdmpkrzf.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a chave `sb_publishable_...` |

Redeploy para as variáveis valerem:

```bash
npx vercel --prod
```

## 4. Instalar no celular

Abra a URL da Vercel no celular:

- **iPhone (Safari):** Compartilhar → *Adicionar à Tela de Início*
- **Android (Chrome):** menu ⋮ → *Instalar app*

## Depois

Ligar o deploy automático a cada `git push`: crie um repositório **privado**
no GitHub e conecte em **Vercel → Project → Settings → Git**. Sendo dado
financeiro de vocês, o repositório precisa ser privado.

## Notas

- A `anon key` é pública por natureza — quem protege os dados é o RLS do
  `schema.sql`. A `service_role` / `sb_secret_...` **não** é usada pelo app e
  não deve entrar em variável de ambiente nenhuma.
- O service worker só cacheia ícones e bundles com hash. Página e resposta do
  Supabase nunca são guardadas: cache ali significaria saldo velho na tela e
  dado financeiro parado no aparelho.
