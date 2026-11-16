-- =============================================================================
-- BBS | DADOS DE DEMONSTRAÇÃO (opcional) - produtos, clientes, cupons e avaliações
-- Execute DEPOIS de database/bbs_banco_completo.sql. Repetível: não duplica nada
-- e não apaga dados existentes. Tudo fictício (projeto acadêmico).
--
-- Clientes de teste (senha de todos: Demo@2026):
--   ana.souza@demo.bbs | bruno.lima@demo.bbs | carla.mendes@demo.bbs
--   diego.alves@demo.bbs | elisa.rocha@demo.bbs
-- Cupons: BBS10 (10%) e PROMO20 (20%), válidos até 31/12/2027, 200 usos cada.
-- Conta ADMIN: criada pela API a partir de BBS_ADMIN_EMAIL / BBS_ADMIN_PASSWORD.
-- As descrições dos produtos trazem socket, DDR, formato e fonte recomendada de
-- propósito: é com elas que o chatbot confere a compatibilidade das peças.
-- =============================================================================
USE apibbs;
GO
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
BEGIN TRY
    BEGIN TRANSACTION;

    -- 1) Produtos (45): os 17 do catálogo inicial + 28 extras para montar PCs de vários orçamentos
    INSERT INTO dbo.produto (nome,descricao,preco,estoque,data_criacao,tipo,marca,img_url,ativo)
    SELECT s.nome,s.descricao,s.preco,s.estoque,SYSDATETIME(),s.tipo,s.marca,s.img_url,1
    FROM (VALUES
    (N'RTX 3060',N'Nvidia PCYES; fonte recomendada 550W',2199.00,10,N'gpu',N'Nvidia',N'https://m.media-amazon.com/images/I/61B8S-xnakL._AC_SY450_.jpg'),
    (N'RTX 4070 SUPER',N'NVIDIA GeForce 12GB GDDR6X; fonte recomendada 650W',4499.99,8,N'gpu',N'Nvidia',N'https://img.terabyteshop.com.br/produto/g/placa-de-video-gigabyte-nvidia-geforce-rtx-4070-super-windforce-oc-12gb-gddr6x-dlss-ray-tracing-gv-n407swf3oc-12gd_186122.jpg'),
    (N'NVIDIA RTX 4090',N'GPU 24GB GDDR6X para jogos em 4K; fonte recomendada 850W',11999.99,5,N'gpu',N'Nvidia',N'https://cdn.custompc.com/wp-content/sites/custompc/2023/03/nvidia-geforce-rtx-4090-review-01.jpg'),
    (N'Core i3 14100F',N'Intel; socket LGA1700',699.99,15,N'cpu',N'Intel',N'https://media.pichau.com.br/media/catalog/product/cache/2f958555330323e505eba7ce930bdf27/b/x/bx8071514100f.jpg'),
    (N'AMD Ryzen 5 5600',N'Processador 6-Core AM4; socket AM4',929.99,12,N'cpu',N'AMD',N'https://media.pichau.com.br/media/catalog/product/cache/2f958555330323e505eba7ce930bdf27/1/0/100-100000927box_1.jpg'),
    (N'HyperX 16GB',N'Kingston DDR4 3200MHz; memória DDR4',1099.99,20,N'ram',N'Kingston',N'https://m.media-amazon.com/images/I/614ZZYefLjL._AC_SX679_.jpg'),
    (N'SSD NV2 1TB',N'Kingston NVMe M.2',750.00,18,N'ssd',N'Kingston',N'https://m.media-amazon.com/images/I/71NfMZKkpQL._AC_SX679_.jpg'),
    (N'SSD NV3 1TB',N'Kingston NVMe M.2',900.00,14,N'ssd',N'Kingston',N'https://m.media-amazon.com/images/I/71c5uuoM1bL._AC_SX522_.jpg'),
    (N'B550M Gaming X',N'Gigabyte; socket AM4; memória DDR4; formato Micro-ATX',1700.00,7,N'mae',N'Gigabyte',N'https://www.gigabyte.com/FileUpload/Global/KeyFeature/3935/innergigabyte/images/product/summary.png'),
    (N'Corsair CV550',N'Fonte 550W 80 Plus Bronze',499.99,25,N'fonte',N'Corsair',N'https://assets.corsair.com/image/upload/c_pad,q_85,h_1100,w_1100,f_auto/products/Power-Supply-Units/CP-9020210-BR/Gallery/CV550_PSU_13.webp'),
    (N'Hyper 212 Black',N'Cooler Master Air Tower 120mm; sockets AM4 e LGA1700',279.99,30,N'cooler',N'Cooler Master',N'https://m.media-amazon.com/images/I/81fmLqNqa3L._AC_SY450_.jpg'),
    (N'Corsair 4000D RGB',N'Mid Tower ATX; suporta ATX, Micro-ATX e Mini-ITX; Vidro Temperado',799.99,9,N'gabinete',N'Corsair',N'https://images5.kabum.com.br/produtos/fotos/657435/gabinete-gamer-corsair-4000d-rs-argb-mid-tower-lateral-em-vidro-com-3x-fans-rs-argb-preto-cc-9011296-ww_1738086483_gg.jpg'),
    (N'Monitor LG 27" 144Hz',N'LG UltraGear IPS Full HD',1499.99,11,N'monitor',N'LG',N'https://m.media-amazon.com/images/I/51Z9x1zdkGL._AC_SY355_.jpg'),
    (N'Logitech G502 Hero',N'Mouse Gamer 25.600 DPI',399.99,22,N'mouse',N'Logitech',N'https://m.media-amazon.com/images/I/61mpMH5TzkL._AC_SX679_.jpg'),
    (N'Redragon Kumara K552',N'Teclado Mecânico TKL RGB',249.99,17,N'teclado',N'Redragon',N'https://m.media-amazon.com/images/I/71CkbBHCYFL._AC_SX679_.jpg'),
    (N'Redragon Flick XL',N'Mousepad Extended 80x30cm',129.99,35,N'mousepad',N'Redragon',N'https://m.media-amazon.com/images/I/71vOT7BPQUL._AC_SX679_.jpg'),
    (N'HyperX Cloud II',N'Headset Gamer 7.1 Surround',549.99,13,N'headset',N'HyperX',N'https://m.media-amazon.com/images/I/71Kxk3yLaaL._AC_SX679_.jpg'),
    (N'Core i5 12400F',N'Intel; socket LGA1700; 6 núcleos; suporta DDR4 e DDR5',899.90,14,N'cpu',N'Intel',NULL),
    (N'Core i5 14600K',N'Intel; socket LGA1700; 14 núcleos; suporta DDR4 e DDR5',1899.90,8,N'cpu',N'Intel',NULL),
    (N'AMD Ryzen 7 5700X',N'Processador 8-Core; socket AM4',1199.90,10,N'cpu',N'AMD',NULL),
    (N'AMD Ryzen 5 7600',N'Processador 6-Core; socket AM5; suporta DDR5',1299.90,12,N'cpu',N'AMD',NULL),
    (N'AMD Ryzen 7 7800X3D',N'Processador 8-Core com 3D V-Cache; socket AM5; suporta DDR5',2999.90,6,N'cpu',N'AMD',NULL),
    (N'A520M Aorus Elite',N'Gigabyte; socket AM4; memória DDR4; formato Micro-ATX',599.90,15,N'mae',N'Gigabyte',NULL),
    (N'B650M Aorus Elite',N'Gigabyte; socket AM5; memória DDR5; formato Micro-ATX',1349.90,9,N'mae',N'Gigabyte',NULL),
    (N'B660M DS3H DDR4',N'Gigabyte; socket LGA1700; memória DDR4; formato Micro-ATX',899.90,11,N'mae',N'Gigabyte',NULL),
    (N'Z790 Aorus Elite DDR5',N'Gigabyte; socket LGA1700; memória DDR5; formato ATX',2199.90,5,N'mae',N'Gigabyte',NULL),
    (N'Crucial 16GB DDR4',N'Crucial DDR4 3200MHz; memória DDR4; 2 pentes de 8GB',329.90,30,N'ram',N'Crucial',NULL),
    (N'Kingston Fury Beast 16GB DDR5',N'Kingston DDR5 5600MHz; memória DDR5; 2 pentes de 8GB',449.90,22,N'ram',N'Kingston',NULL),
    (N'Corsair Vengeance 32GB DDR5',N'Corsair DDR5 6000MHz; memória DDR5; 2 pentes de 16GB',899.90,12,N'ram',N'Corsair',NULL),
    (N'RX 6600',N'AMD Radeon 8GB GDDR6; fonte recomendada 500W',1599.90,9,N'gpu',N'AMD',NULL),
    (N'RTX 4060',N'NVIDIA GeForce 8GB GDDR6; fonte recomendada 550W',1999.90,13,N'gpu',N'Nvidia',NULL),
    (N'RTX 4060 Ti',N'NVIDIA GeForce 8GB GDDR6; fonte recomendada 550W',2899.90,7,N'gpu',N'Nvidia',NULL),
    (N'RX 7800 XT',N'AMD Radeon 16GB GDDR6; fonte recomendada 700W',3799.90,5,N'gpu',N'AMD',NULL),
    (N'RTX 4080 SUPER',N'NVIDIA GeForce 16GB GDDR6X; fonte recomendada 750W',7499.90,3,N'gpu',N'Nvidia',NULL),
    (N'Corsair CV650',N'Fonte 650W 80 Plus Bronze',599.90,18,N'fonte',N'Corsair',NULL),
    (N'Corsair RM750e',N'Fonte 750W 80 Plus Gold; modular',899.90,10,N'fonte',N'Corsair',NULL),
    (N'Gigabyte P850GM',N'Fonte 850W 80 Plus Gold; modular',1099.90,6,N'fonte',N'Gigabyte',NULL),
    (N'Cooler Master MasterBox Q300L',N'Mini Tower; suporta Micro-ATX e Mini-ITX; lateral em acrílico',349.90,14,N'gabinete',N'Cooler Master',NULL),
    (N'NZXT H5 Flow',N'Mid Tower ATX; suporta ATX, Micro-ATX e Mini-ITX; painel perfurado',749.90,8,N'gabinete',N'NZXT',NULL),
    (N'SSD Samsung 980 500GB',N'Samsung NVMe M.2 500GB',349.90,20,N'ssd',N'Samsung',NULL),
    (N'SSD WD Black SN770 2TB',N'WD NVMe M.2 2TB; leitura 5150 MB/s',1099.90,7,N'ssd',N'WD',NULL),
    (N'Monitor Samsung Odyssey 24" 165Hz',N'Samsung Odyssey IPS Full HD 165Hz 1ms',1199.90,9,N'monitor',N'Samsung',NULL),
    (N'Mouse Redragon Cobra',N'Mouse Gamer 12400 DPI RGB',119.90,40,N'mouse',N'Redragon',NULL),
    (N'Teclado Logitech G413',N'Teclado Mecânico Gamer Backlit',499.90,12,N'teclado',N'Logitech',NULL),
    (N'Headset Redragon Zeus X',N'Headset Gamer 7.1 USB RGB',299.90,16,N'headset',N'Redragon',NULL)
    ) AS s(nome,descricao,preco,estoque,tipo,marca,img_url)
    WHERE NOT EXISTS (SELECT 1 FROM dbo.produto p WITH (UPDLOCK,HOLDLOCK) WHERE p.nome=s.nome);

    -- Completa a marca dos produtos criados antes de existir essa coluna.
    UPDATE p SET p.marca=s.marca
    FROM dbo.produto p JOIN (VALUES
    (N'RTX 3060',N'Nvidia'),
    (N'RTX 4070 SUPER',N'Nvidia'),
    (N'NVIDIA RTX 4090',N'Nvidia'),
    (N'Core i3 14100F',N'Intel'),
    (N'AMD Ryzen 5 5600',N'AMD'),
    (N'HyperX 16GB',N'Kingston'),
    (N'SSD NV2 1TB',N'Kingston'),
    (N'SSD NV3 1TB',N'Kingston'),
    (N'B550M Gaming X',N'Gigabyte'),
    (N'Corsair CV550',N'Corsair'),
    (N'Hyper 212 Black',N'Cooler Master'),
    (N'Corsair 4000D RGB',N'Corsair'),
    (N'Monitor LG 27" 144Hz',N'LG'),
    (N'Logitech G502 Hero',N'Logitech'),
    (N'Redragon Kumara K552',N'Redragon'),
    (N'Redragon Flick XL',N'Redragon'),
    (N'HyperX Cloud II',N'HyperX'),
    (N'Core i5 12400F',N'Intel'),
    (N'Core i5 14600K',N'Intel'),
    (N'AMD Ryzen 7 5700X',N'AMD'),
    (N'AMD Ryzen 5 7600',N'AMD'),
    (N'AMD Ryzen 7 7800X3D',N'AMD'),
    (N'A520M Aorus Elite',N'Gigabyte'),
    (N'B650M Aorus Elite',N'Gigabyte'),
    (N'B660M DS3H DDR4',N'Gigabyte'),
    (N'Z790 Aorus Elite DDR5',N'Gigabyte'),
    (N'Crucial 16GB DDR4',N'Crucial'),
    (N'Kingston Fury Beast 16GB DDR5',N'Kingston'),
    (N'Corsair Vengeance 32GB DDR5',N'Corsair'),
    (N'RX 6600',N'AMD'),
    (N'RTX 4060',N'Nvidia'),
    (N'RTX 4060 Ti',N'Nvidia'),
    (N'RX 7800 XT',N'AMD'),
    (N'RTX 4080 SUPER',N'Nvidia'),
    (N'Corsair CV650',N'Corsair'),
    (N'Corsair RM750e',N'Corsair'),
    (N'Gigabyte P850GM',N'Gigabyte'),
    (N'Cooler Master MasterBox Q300L',N'Cooler Master'),
    (N'NZXT H5 Flow',N'NZXT'),
    (N'SSD Samsung 980 500GB',N'Samsung'),
    (N'SSD WD Black SN770 2TB',N'WD'),
    (N'Monitor Samsung Odyssey 24" 165Hz',N'Samsung'),
    (N'Mouse Redragon Cobra',N'Redragon'),
    (N'Teclado Logitech G413',N'Logitech'),
    (N'Headset Redragon Zeus X',N'Redragon')
    ) AS s(nome,marca) ON s.nome=p.nome WHERE p.marca IS NULL;

    -- 2) Clientes (senha Demo@2026, guardada como hash BCrypt como a API faz)
    INSERT INTO dbo.bbs_usuario (nome,email,senha_hash,perfil)
    SELECT c.nome,c.email,'$2a$10$PmnznF4u5PyNRr93FhdSGehDKnFwTV5hNihqWp9J75J7pvuJWKeOK','CLIENTE'
    FROM (VALUES
    (N'Ana Souza',N'ana.souza@demo.bbs'),
    (N'Bruno Lima',N'bruno.lima@demo.bbs'),
    (N'Carla Mendes',N'carla.mendes@demo.bbs'),
    (N'Diego Alves',N'diego.alves@demo.bbs'),
    (N'Elisa Rocha',N'elisa.rocha@demo.bbs')
    ) AS c(nome,email)
    WHERE NOT EXISTS (SELECT 1 FROM dbo.bbs_usuario u WHERE u.email=c.email);

    -- 3) Cupons
    INSERT INTO dbo.bbs_cupom (codigo,percentual,limite_usos,usos,validade,ativo)
    SELECT c.codigo,c.percentual,200,0,'2027-12-31T23:59:59',1
    FROM (VALUES ('BBS10',10),('PROMO20',20)) AS c(codigo,percentual)
    WHERE NOT EXISTS (SELECT 1 FROM dbo.bbs_cupom x WHERE x.codigo=c.codigo);

    -- 4) Avaliações (aparecem como estrelas no catálogo)
    INSERT INTO dbo.bbs_avaliacao (usuario_id,produto_id,autor,nota,comentario,criado_em)
    SELECT u.id,p.id,u.nome,r.nota,r.comentario,SYSDATETIME()
    FROM (VALUES
    (N'ana.souza@demo.bbs',N'RTX 3060',5,N'Roda tudo em 1080p sem esquentar. Ótimo custo-benefício.'),
    (N'bruno.lima@demo.bbs',N'RTX 3060',4,N'Boa placa, só a entrega que demorou um pouco.'),
    (N'carla.mendes@demo.bbs',N'AMD Ryzen 5 5600',5,N'Processador excelente para jogos, esquenta pouco com o cooler certo.'),
    (N'diego.alves@demo.bbs',N'AMD Ryzen 5 5600',4,N'Muito bom pelo preço. Precisei só atualizar a BIOS da placa.'),
    (N'ana.souza@demo.bbs',N'SSD NV2 1TB',5,N'Instalação simples e carregamento bem rápido.'),
    (N'elisa.rocha@demo.bbs',N'Corsair CV550',4,N'Fonte silenciosa, atende bem uma placa de entrada.'),
    (N'bruno.lima@demo.bbs',N'Corsair 4000D RGB',5,N'Gabinete lindo e com ótimo fluxo de ar.'),
    (N'carla.mendes@demo.bbs',N'Logitech G502 Hero',5,N'Mouse confortável, os botões extras ajudam muito.'),
    (N'diego.alves@demo.bbs',N'HyperX Cloud II',4,N'Som ótimo, microfone poderia ser melhor.'),
    (N'elisa.rocha@demo.bbs',N'Monitor LG 27" 144Hz',5,N'144Hz faz diferença. Cores boas para o preço.'),
    (N'ana.souza@demo.bbs',N'Redragon Kumara K552',3,N'Bom para começar, mas o barulho dos switches incomoda.'),
    (N'bruno.lima@demo.bbs',N'RTX 4070 SUPER',5,N'Desempenho excelente em 1440p, vale o investimento.')
    ) AS r(email,produto,nota,comentario)
    JOIN dbo.bbs_usuario u ON u.email=r.email
    JOIN dbo.produto p ON p.nome=r.produto
    WHERE NOT EXISTS (SELECT 1 FROM dbo.bbs_avaliacao a WHERE a.usuario_id=u.id AND a.produto_id=p.id);

    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    THROW;
END CATCH;
GO
SELECT (SELECT COUNT(*) FROM dbo.produto) AS produtos, (SELECT COUNT(*) FROM dbo.bbs_usuario) AS usuarios,
       (SELECT COUNT(*) FROM dbo.bbs_cupom) AS cupons, (SELECT COUNT(*) FROM dbo.bbs_avaliacao) AS avaliacoes;
GO
