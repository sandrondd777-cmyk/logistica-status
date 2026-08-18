# Publicar na Netlify

1. Crie uma conta em [netlify.com](https://www.netlify.com/).
2. Envie esta pasta para um repositório GitHub, sem `node_modules` e `dist`.
3. Na Netlify, escolha **Add new project** > **Import an existing project** e selecione o repositório.
4. A Netlify detectará o arquivo `netlify.toml`. Confirme:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Clique em **Publish**. O endereço inicial será parecido com `https://nome-do-projeto.netlify.app`.

## Dados oficiais

O front-end consulta `/.netlify/functions/status`. Essa função mantém os links oficiais e verifica a acessibilidade da página oficial de disponibilidade da NF-e. Ela não transforma indisponibilidade de rede em indisponibilidade da SEFAZ e não usa relatos de usuários para mudar o status público.

Antes de classificar automaticamente cada UF como normal, instável ou indisponível, a função precisa receber um interpretador validado da tabela oficial ou uma integração formal do respectivo órgão. Isso evita publicar uma informação operacional incorreta.

## Relatos

`/.netlify/functions/reports` recebe o relato sem persistência. Para guardar e moderar relatos, conecte um banco de dados e proteja o endpoint contra abuso antes de exibi-los publicamente.
