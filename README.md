# Logística Status

Painel interno para acompanhamento de indisponibilidades de serviços usados pela operação logística.

## Desenvolvimento

```bash
npm install
npm run dev
```

As funções de servidor rodam em ambiente Netlify. Para desenvolver com funções e armazenamento local, use `netlify dev` após instalar o Netlify CLI. Em produção, publique o site no Netlify com Netlify Blobs habilitado.

## Escopo do monitoramento

O painel consulta a acessibilidade dos portais oficiais de NF-e, CT-e, MDF-e e referências públicas da ANTT. Uma resposta HTTP indica somente que o portal respondeu; não confirma que a emissão fiscal, consulta ou operação logística está funcionando. A equipe deve registrar e acompanhar incidentes no painel. Os registros compartilhados ficam em Netlify Blobs.

O acesso à tela deve ser restrito à equipe por meio das configurações de acesso do site no Netlify antes da publicação, pois os incidentes são compartilhados com qualquer pessoa que consiga abrir o endereço.
