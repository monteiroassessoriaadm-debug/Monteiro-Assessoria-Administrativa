-- Adiciona o serviço "Criação de Sites" ao catálogo (aparece em /nossos-servicos)
-- e um modelo de documento com o briefing padrão para enviar ao cliente.
-- Preço sob orçamento (varia por cliente) — nada de valor fixo inventado.

INSERT INTO "services" (
  "id", "name", "category", "description", "pricingMode", "active", "updatedAt"
) VALUES (
  'svc-criacao-sites-2026',
  'Criação de Sites',
  'Digital',
  'Criação de sites para empresas e clientes, com identidade visual própria para cada negócio e pensados para funcionar bem no celular.',
  'ORCAMENTO',
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "document_templates" (
  "id", "baseTemplateId", "name", "category", "content", "fieldsSchema", "updatedAt"
) VALUES (
  'tpl-briefing-criacao-site-2026',
  'tpl-briefing-criacao-site-2026',
  'Briefing — Criação de Site',
  'Serviços digitais',
  'BRIEFING PARA CRIAÇÃO DO SEU SITE

Olá, {{NOME_CLIENTE}}! Que bom ter você com a gente.

Para criar o site do seu negócio, a Monteiro Assessoria Administrativa precisa de algumas informações. Pode responder com calma, item por item — o que você não tiver em mãos agora, é só avisar que a gente ajusta depois.

1. DADOS DO NEGÓCIO
Nome do negócio, ramo de atuação, cidade e endereço de atendimento (se houver).

2. PÚBLICO E OBJETIVO
Quem é o seu cliente e o que você mais quer vender ou divulgar no site?

3. SERVIÇOS E PREÇOS
Lista dos serviços/produtos oferecidos, com preços (ou "sob consulta", se preferir não exibir valores).

4. ATENDIMENTO
Dias e horários de atendimento.

5. CONTATOS E REDES SOCIAIS
WhatsApp que vai receber os pedidos pelo site, Instagram e outras redes sociais.

6. MATERIAL DISPONÍVEL
Envie (ou nos diga onde buscar): logo, fotos do negócio/produtos, PDFs, cartas de procedimentos, depoimentos de clientes.

7. GOSTO VISUAL
Cores que você ama e cores que não quer no site. Sites ou perfis de Instagram que você admira e gostaria de usar como referência.

8. FUNCIONALIDADES DESEJADAS
Marque o que você gostaria que o site tivesse:
( ) Botão de agendamento que já abre o WhatsApp com mensagem pronta
( ) Catálogo com preços
( ) Portfólio de fotos (com antes/depois, se for o caso)
( ) Cursos ou turmas
( ) Depoimentos de clientes
( ) Perguntas frequentes
( ) Mapa de localização
( ) QR Code para imprimir
( ) Outra: ___________________

9. O QUE NÃO QUER NO SITE
Tem algo que você não quer que apareça no site? Nos conte.

10. PRAZO E MANUTENÇÃO
Tem um prazo em mente para o site ficar pronto? Deseja manutenção mensal (atualizações de preços, fotos, textos) depois da entrega?

Qualquer dúvida, é só chamar a gente no WhatsApp (94) 99236-2433.

Obrigado por confiar na Monteiro!',
  '[]',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
