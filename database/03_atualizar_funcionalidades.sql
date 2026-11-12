-- Execute no SSMS com a API parada. Preserva produtos, contas e pedidos.
-- Banco novo: execute primeiro 01_criar_banco.sql. Pode repetir este script.
USE apibbs;
GO
SET XACT_ABORT ON;
BEGIN TRY
    IF OBJECT_ID(N'dbo.produto',N'U') IS NULL OR OBJECT_ID(N'dbo.bbs_usuario',N'U') IS NULL
        OR OBJECT_ID(N'dbo.bbs_compra',N'U') IS NULL
        THROW 50001, 'Execute primeiro database/01_criar_banco.sql neste banco.', 1;
    BEGIN TRANSACTION;
    IF COL_LENGTH(N'dbo.produto',N'ativo') IS NULL
        ALTER TABLE dbo.produto ADD ativo BIT NOT NULL DEFAULT(1) WITH VALUES;
    IF COL_LENGTH(N'dbo.produto',N'img_url') IS NULL
        ALTER TABLE dbo.produto ADD img_url VARCHAR(MAX) NULL;
    IF COL_LENGTH(N'dbo.produto',N'tipo') IS NULL
        ALTER TABLE dbo.produto ADD tipo VARCHAR(255) NULL;
    IF COL_LENGTH(N'dbo.produto',N'data_criacao') IS NULL
        ALTER TABLE dbo.produto ADD data_criacao DATETIME2(6) NULL;

    IF OBJECT_ID(N'dbo.bbs_favorito',N'U') IS NULL
        CREATE TABLE dbo.bbs_favorito (
            usuario_id BIGINT NOT NULL,
            produto_id INT NOT NULL,
            CONSTRAINT pk_bbs_favorito PRIMARY KEY(usuario_id,produto_id),
            CONSTRAINT fk_favorito_usuario FOREIGN KEY(usuario_id) REFERENCES dbo.bbs_usuario(id),
            CONSTRAINT fk_favorito_produto FOREIGN KEY(produto_id) REFERENCES dbo.produto(id)
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
    -- Não inventa datas de mudanças anteriores. Preserva apenas o estado atual.
    INSERT INTO dbo.bbs_compra_historico(compra_id,ordem,status,ocorrido_em,origem)
        SELECT c.id,0,c.status,NULL,'IMPORTADO'
        FROM dbo.bbs_compra c
        WHERE NOT EXISTS(SELECT 1 FROM dbo.bbs_compra_historico h WHERE h.compra_id=c.id);
    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    THROW;
END CATCH;
GO
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME IN ('produto','bbs_usuario','bbs_compra','bbs_compra_item','bbs_favorito','bbs_compra_historico');
GO
