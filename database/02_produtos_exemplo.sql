-- Opcional: execute depois de 01_criar_banco.sql, em um banco de demonstracao.
-- Os valores sao ficticios. Nao cria usuarios, senhas ou pedidos.
USE apibbs;
GO
SET XACT_ABORT ON;
BEGIN TRANSACTION;
INSERT INTO dbo.produto (nome,descricao,preco,estoque,data_criacao,img_url,tipo,ativo)
SELECT s.nome,s.descricao,s.preco,s.estoque,SYSDATETIME(),NULL,s.tipo,1
FROM (VALUES
    ('SSD BBS 1 TB','Produto ficticio para demonstrar armazenamento NVMe.',399.90,12,'ssd'),
    ('Memoria BBS 16 GB','Produto ficticio para demonstrar memoria DDR4.',199.90,20,'ram'),
    ('Processador BBS 6 nucleos','Produto ficticio para a apresentacao do catalogo.',899.90,8,'cpu'),
    ('Mouse BBS Gamer','Produto ficticio com categoria de perifericos.',89.90,15,'mouse'),
    ('Placa de Video BBS','Produto ficticio para demonstrar a categoria GPU.',1999.90,5,'gpu')
) AS s(nome,descricao,preco,estoque,tipo)
WHERE NOT EXISTS (SELECT 1 FROM dbo.produto p WITH (UPDLOCK,HOLDLOCK) WHERE p.nome=s.nome);
COMMIT;
GO
SELECT id,nome,preco,estoque,tipo,ativo FROM dbo.produto ORDER BY id;
