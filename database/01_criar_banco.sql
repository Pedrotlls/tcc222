-- Execute no SQL Server Management Studio (SSMS), conectado ao servidor.
-- Criacao inicial: nao apaga banco, tabelas ou registros existentes.
-- Depois execute 03_atualizar_funcionalidades.sql antes de iniciar a API.
USE master;
GO
IF DB_ID(N'apibbs') IS NULL
    EXEC(N'CREATE DATABASE [apibbs]');
GO
USE apibbs;
GO
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;

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
        CONSTRAINT ck_produto_preco CHECK (preco > 0),
        CONSTRAINT ck_produto_estoque CHECK (estoque >= 0 AND estoque <= 1000000)
    );

    IF OBJECT_ID(N'dbo.bbs_usuario',N'U') IS NULL
    CREATE TABLE dbo.bbs_usuario (
        id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT pk_bbs_usuario PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL CONSTRAINT uq_bbs_usuario_email UNIQUE,
        senha_hash VARCHAR(255) NOT NULL,
        perfil VARCHAR(255) NOT NULL CONSTRAINT df_usuario_perfil DEFAULT 'CLIENTE',
        CONSTRAINT ck_usuario_perfil CHECK (perfil IN ('CLIENTE','ADMIN'))
    );

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
    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
END CATCH;
GO
SELECT TABLE_SCHEMA, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME IN ('produto','bbs_usuario','bbs_compra','bbs_compra_item');
GO
-- Tabelas existentes sao preservadas, nao migradas. Se o backend acusar esquema
-- divergente, confira os nomes/tipos antes de adaptar. Nao exclua dados para corrigir.
-- Contas de acesso sao criadas pela API; nunca insira senha em texto puro aqui.
