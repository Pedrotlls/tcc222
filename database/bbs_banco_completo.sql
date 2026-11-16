-- =============================================================================
-- BBS - Bits Bytes Store | BANCO DE DADOS COMPLETO EM UM ÚNICO ARQUIVO
-- SQL Server (SSMS, Azure Data Studio, VS Code ou sqlcmd)
--
-- Substitui a sequência 01 a 08. Cria o banco "apibbs" e TODAS as tabelas, já na
-- versão final (produtos com marca, usuários com CPF, cupons, avaliações com votos,
-- carrinho, endereços, tokens, recuperação de senha, histórico de pedidos).
--
-- * Repetível: não apaga banco, tabelas nem registros existentes.
-- * Banco NOVO: execute o arquivo inteiro e pronto.
-- * Banco JÁ EXISTENTE (criado pelos scripts antigos): também pode executar; só
--   falta criar o que não existe e completa colunas ausentes. Pare a API antes.
-- * Contas de acesso são criadas pela API; nunca insira senha em texto puro aqui.
-- * Produtos de demonstração: descomente a seção 10 no final do arquivo.
-- =============================================================================
USE master;
GO
IF DB_ID(N'apibbs') IS NULL
    EXEC(N'CREATE DATABASE [apibbs]');
GO
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

    -- 1) Produtos -----------------------------------------------------------
    IF OBJECT_ID(N'dbo.produto',N'U') IS NULL
        CREATE TABLE dbo.produto (
            id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_produto PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            descricao VARCHAR(4000) NULL,
            preco DECIMAL(16,2) NOT NULL,
            estoque INT NOT NULL,
            data_criacao DATETIME2(6) NULL,
            img_url VARCHAR(MAX) NULL,
            tipo VARCHAR(255) NULL,
            ativo BIT NOT NULL CONSTRAINT df_produto_ativo DEFAULT 1,
            marca VARCHAR(80) NULL,
            CONSTRAINT ck_produto_preco CHECK (preco > 0),
            CONSTRAINT ck_produto_estoque CHECK (estoque >= 0 AND estoque <= 1000000)
        );

    -- 2) Usuários -----------------------------------------------------------
    IF OBJECT_ID(N'dbo.bbs_usuario',N'U') IS NULL
        CREATE TABLE dbo.bbs_usuario (
            id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT pk_bbs_usuario PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            email VARCHAR(150) NOT NULL CONSTRAINT uq_bbs_usuario_email UNIQUE,
            senha_hash VARCHAR(255) NOT NULL,
            perfil VARCHAR(255) NOT NULL CONSTRAINT df_usuario_perfil DEFAULT 'CLIENTE',
            cpf VARCHAR(11) NULL,
            carrinho_versao BIGINT NOT NULL CONSTRAINT df_usuario_carrinho_versao DEFAULT(0),
            CONSTRAINT ck_usuario_perfil CHECK (perfil IN ('CLIENTE','ADMIN'))
        );

    -- 3) Pedidos ------------------------------------------------------------
    IF OBJECT_ID(N'dbo.bbs_compra',N'U') IS NULL
        CREATE TABLE dbo.bbs_compra (
            id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT pk_bbs_compra PRIMARY KEY,
            usuario_id BIGINT NOT NULL,
            chave VARCHAR(80) NOT NULL,
            cliente_nome VARCHAR(255) NOT NULL,
            cliente_email VARCHAR(255) NOT NULL,
            criado_em DATETIME2(6) NOT NULL,
            status VARCHAR(255) NOT NULL,
            pagamento VARCHAR(255) NOT NULL,
            entrega VARCHAR(255) NOT NULL,
            endereco VARCHAR(600) NOT NULL,
            subtotal DECIMAL(16,2) NOT NULL,
            frete DECIMAL(16,2) NOT NULL,
            desconto DECIMAL(16,2) NOT NULL,
            total DECIMAL(16,2) NOT NULL,
            cupom VARCHAR(30) NULL,
            acompanhamento VARCHAR(36) NULL,
            CONSTRAINT uq_compra_chave UNIQUE (usuario_id,chave),
            CONSTRAINT fk_compra_usuario FOREIGN KEY (usuario_id) REFERENCES dbo.bbs_usuario(id),
            CONSTRAINT ck_compra_status CHECK (status IN ('RECEBIDO','SEPARANDO','ENVIADO','ENTREGUE','CANCELADO')),
            CONSTRAINT ck_compra_pagamento CHECK (pagamento IN ('pix','boleto','credito','debito')),
            CONSTRAINT ck_compra_entrega CHECK (entrega IN ('normal','expresso')),
            CONSTRAINT ck_compra_valores CHECK (subtotal >= 0 AND frete >= 0 AND desconto >= 0 AND desconto <= subtotal AND total = subtotal + frete - desconto)
        );

    -- ElementCollection do Hibernate: a API envia compra_id e produto_id.
    IF OBJECT_ID(N'dbo.bbs_compra_item',N'U') IS NULL
        CREATE TABLE dbo.bbs_compra_item (
            compra_id BIGINT NOT NULL,
            produto_id INT NOT NULL,
            nome VARCHAR(255) NOT NULL,
            quantidade INT NOT NULL,
            preco DECIMAL(16,2) NOT NULL,
            CONSTRAINT pk_compra_item PRIMARY KEY (compra_id,produto_id),
            CONSTRAINT fk_item_compra FOREIGN KEY (compra_id) REFERENCES dbo.bbs_compra(id),
            CONSTRAINT fk_item_produto FOREIGN KEY (produto_id) REFERENCES dbo.produto(id),
            CONSTRAINT ck_item_quantidade CHECK (quantidade BETWEEN 1 AND 99),
            CONSTRAINT ck_item_preco CHECK (preco > 0)
        );

    IF OBJECT_ID(N'dbo.bbs_compra_historico',N'U') IS NULL
        CREATE TABLE dbo.bbs_compra_historico (
            compra_id BIGINT NOT NULL,
            ordem INT NOT NULL,
            status VARCHAR(30) NOT NULL,
            ocorrido_em DATETIME2(6) NULL,
            origem VARCHAR(20) NOT NULL,
            CONSTRAINT pk_bbs_compra_historico PRIMARY KEY(compra_id,ordem),
            CONSTRAINT fk_historico_compra FOREIGN KEY(compra_id) REFERENCES dbo.bbs_compra(id),
            CONSTRAINT ck_historico_status CHECK(status IN ('RECEBIDO','SEPARANDO','ENVIADO','ENTREGUE','CANCELADO')),
            CONSTRAINT ck_historico_origem CHECK(origem IN ('CLIENTE','ADMIN','IMPORTADO'))
        );

    -- 4) Favoritos, endereços, cupons, avaliações, votos e carrinho -----------
    IF OBJECT_ID(N'dbo.bbs_favorito',N'U') IS NULL
        CREATE TABLE dbo.bbs_favorito (
            usuario_id BIGINT NOT NULL,
            produto_id INT NOT NULL,
            CONSTRAINT pk_bbs_favorito PRIMARY KEY(usuario_id,produto_id),
            CONSTRAINT fk_favorito_usuario FOREIGN KEY(usuario_id) REFERENCES dbo.bbs_usuario(id),
            CONSTRAINT fk_favorito_produto FOREIGN KEY(produto_id) REFERENCES dbo.produto(id)
        );

    IF OBJECT_ID(N'dbo.bbs_endereco',N'U') IS NULL
        CREATE TABLE dbo.bbs_endereco (
            id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
            usuario_id BIGINT NOT NULL,
            apelido VARCHAR(40) NOT NULL,
            cep VARCHAR(8) NOT NULL,
            rua VARCHAR(120) NOT NULL,
            numero VARCHAR(20) NOT NULL,
            complemento VARCHAR(100) NULL,
            bairro VARCHAR(80) NOT NULL,
            cidade VARCHAR(80) NOT NULL,
            uf VARCHAR(2) NOT NULL,
            principal BIT NOT NULL DEFAULT(0),
            CONSTRAINT fk_endereco_usuario FOREIGN KEY(usuario_id) REFERENCES dbo.bbs_usuario(id)
        );

    IF OBJECT_ID(N'dbo.bbs_cupom',N'U') IS NULL
        CREATE TABLE dbo.bbs_cupom (
            codigo VARCHAR(30) NOT NULL PRIMARY KEY,
            percentual INT NOT NULL CHECK(percentual BETWEEN 1 AND 50),
            limite_usos INT NOT NULL CHECK(limite_usos>0),
            usos INT NOT NULL,
            validade DATETIME2(6) NOT NULL,
            ativo BIT NOT NULL,
            CONSTRAINT ck_cupom_usos CHECK(usos>=0 AND usos<=limite_usos)
        );

    IF OBJECT_ID(N'dbo.bbs_avaliacao',N'U') IS NULL
        CREATE TABLE dbo.bbs_avaliacao (
            id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
            usuario_id BIGINT NOT NULL REFERENCES dbo.bbs_usuario(id),
            produto_id INT NOT NULL REFERENCES dbo.produto(id),
            autor VARCHAR(100) NOT NULL,
            nota INT NOT NULL CHECK(nota BETWEEN 1 AND 5),
            comentario VARCHAR(1000) NOT NULL,
            criado_em DATETIME2(6) NOT NULL,
            CONSTRAINT ux_avaliacao_usuario_produto UNIQUE(usuario_id,produto_id)
        );

    IF OBJECT_ID(N'dbo.bbs_avaliacao_voto',N'U') IS NULL
        CREATE TABLE dbo.bbs_avaliacao_voto (
            id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
            avaliacao_id BIGINT NOT NULL REFERENCES dbo.bbs_avaliacao(id),
            usuario_id BIGINT NOT NULL REFERENCES dbo.bbs_usuario(id),
            util BIT NOT NULL,
            criado_em DATETIME2(6) NOT NULL,
            CONSTRAINT ux_avaliacao_voto_usuario UNIQUE(avaliacao_id,usuario_id)
        );

    IF OBJECT_ID(N'dbo.bbs_carrinho_item',N'U') IS NULL
        CREATE TABLE dbo.bbs_carrinho_item (
            id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
            usuario_id BIGINT NOT NULL REFERENCES dbo.bbs_usuario(id),
            produto_id INT NOT NULL REFERENCES dbo.produto(id),
            quantidade INT NOT NULL CHECK(quantidade BETWEEN 1 AND 99),
            CONSTRAINT ux_carrinho_usuario_produto UNIQUE(usuario_id,produto_id)
        );

    -- 5) Autenticação: sessões (tokens) e recuperação de senha ----------------
    IF OBJECT_ID(N'dbo.bbs_sessao_token',N'U') IS NULL
        CREATE TABLE dbo.bbs_sessao_token (
            id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
            usuario_id BIGINT NOT NULL,
            familia VARCHAR(36) NOT NULL,
            acesso_hash VARCHAR(64) NOT NULL UNIQUE,
            renovacao_hash VARCHAR(64) NOT NULL UNIQUE,
            credencial_hash VARCHAR(64) NOT NULL,
            criado_em DATETIME2(6) NOT NULL,
            acesso_expira_em DATETIME2(6) NOT NULL,
            expira_em DATETIME2(6) NOT NULL,
            revogado BIT NOT NULL DEFAULT(0),
            CONSTRAINT fk_sessao_usuario FOREIGN KEY(usuario_id) REFERENCES dbo.bbs_usuario(id)
        );

    IF OBJECT_ID(N'dbo.bbs_recuperacao_senha',N'U') IS NULL
        CREATE TABLE dbo.bbs_recuperacao_senha (
            usuario_id BIGINT NOT NULL PRIMARY KEY,
            token_hash VARCHAR(64) NOT NULL UNIQUE,
            credencial_hash VARCHAR(64) NOT NULL,
            criado_em DATETIME2 NOT NULL,
            expira_em DATETIME2 NOT NULL,
            usado BIT NOT NULL DEFAULT 0,
            CONSTRAINT fk_recuperacao_usuario FOREIGN KEY(usuario_id) REFERENCES dbo.bbs_usuario(id)
        );

    -- 6) Completa colunas de bancos criados por versões antigas ---------------
    IF COL_LENGTH(N'dbo.produto',N'ativo') IS NULL ALTER TABLE dbo.produto ADD ativo BIT NOT NULL DEFAULT(1) WITH VALUES;
    IF COL_LENGTH(N'dbo.produto',N'img_url') IS NULL ALTER TABLE dbo.produto ADD img_url VARCHAR(MAX) NULL;
    IF COL_LENGTH(N'dbo.produto',N'tipo') IS NULL ALTER TABLE dbo.produto ADD tipo VARCHAR(255) NULL;
    IF COL_LENGTH(N'dbo.produto',N'data_criacao') IS NULL ALTER TABLE dbo.produto ADD data_criacao DATETIME2(6) NULL;
    IF COL_LENGTH(N'dbo.produto',N'marca') IS NULL ALTER TABLE dbo.produto ADD marca VARCHAR(80) NULL;
    IF COL_LENGTH(N'dbo.bbs_usuario',N'cpf') IS NULL ALTER TABLE dbo.bbs_usuario ADD cpf VARCHAR(11) NULL;
    IF COL_LENGTH(N'dbo.bbs_usuario',N'carrinho_versao') IS NULL ALTER TABLE dbo.bbs_usuario ADD carrinho_versao BIGINT NOT NULL CONSTRAINT df_usuario_carrinho_versao DEFAULT(0);
    IF COL_LENGTH(N'dbo.bbs_compra',N'cupom') IS NULL ALTER TABLE dbo.bbs_compra ADD cupom VARCHAR(30) NULL;
    IF COL_LENGTH(N'dbo.bbs_compra',N'acompanhamento') IS NULL ALTER TABLE dbo.bbs_compra ADD acompanhamento VARCHAR(36) NULL;

    -- 7) Dados derivados (sem inventar datas) ----------------------------------
    EXEC(N'UPDATE dbo.bbs_compra SET acompanhamento=CONVERT(VARCHAR(36),NEWID()) WHERE acompanhamento IS NULL');
    EXEC(N'INSERT INTO dbo.bbs_compra_historico(compra_id,ordem,status,ocorrido_em,origem)
           SELECT c.id,0,c.status,NULL,''IMPORTADO'' FROM dbo.bbs_compra c
           WHERE NOT EXISTS(SELECT 1 FROM dbo.bbs_compra_historico h WHERE h.compra_id=c.id)');

    -- 8) Índices -------------------------------------------------------------
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'ux_compra_acompanhamento' AND object_id=OBJECT_ID(N'dbo.bbs_compra'))
        EXEC(N'CREATE UNIQUE INDEX ux_compra_acompanhamento ON dbo.bbs_compra(acompanhamento) WHERE acompanhamento IS NOT NULL');
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'ux_endereco_principal' AND object_id=OBJECT_ID(N'dbo.bbs_endereco'))
        EXEC(N'CREATE UNIQUE INDEX ux_endereco_principal ON dbo.bbs_endereco(usuario_id) WHERE principal=1');
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'ix_sessao_familia' AND object_id=OBJECT_ID(N'dbo.bbs_sessao_token'))
        CREATE INDEX ix_sessao_familia ON dbo.bbs_sessao_token(familia);
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'ix_sessao_usuario' AND object_id=OBJECT_ID(N'dbo.bbs_sessao_token'))
        CREATE INDEX ix_sessao_usuario ON dbo.bbs_sessao_token(usuario_id);
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'ix_sessao_expira' AND object_id=OBJECT_ID(N'dbo.bbs_sessao_token'))
        CREATE INDEX ix_sessao_expira ON dbo.bbs_sessao_token(expira_em);

    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
END CATCH;
GO

-- 9) Conferência: devem aparecer as 13 tabelas abaixo ---------------------------
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME IN (
    'produto','bbs_usuario','bbs_compra','bbs_compra_item','bbs_compra_historico','bbs_favorito',
    'bbs_endereco','bbs_cupom','bbs_avaliacao','bbs_avaliacao_voto','bbs_carrinho_item',
    'bbs_sessao_token','bbs_recuperacao_senha')
ORDER BY TABLE_NAME;
GO

/* 10) OPCIONAL - produtos de demonstração (valores fictícios). Remova esta linha e a última para usar.
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
SELECT id,nome,preco,estoque,tipo,ativo FROM dbo.produto ORDER BY id;
*/
