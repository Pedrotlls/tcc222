-- API parada. Execute depois dos scripts 01, 03, 04 e 05. Migração repetível.
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
BEGIN TRY
    BEGIN TRANSACTION;
    IF COL_LENGTH('dbo.produto','marca') IS NULL ALTER TABLE dbo.produto ADD marca VARCHAR(80) NULL;
    IF COL_LENGTH('dbo.bbs_usuario','cpf') IS NULL ALTER TABLE dbo.bbs_usuario ADD cpf VARCHAR(11) NULL;
    IF COL_LENGTH('dbo.bbs_usuario','carrinho_versao') IS NULL ALTER TABLE dbo.bbs_usuario ADD carrinho_versao BIGINT NOT NULL CONSTRAINT df_usuario_carrinho_versao DEFAULT(0);
    IF COL_LENGTH('dbo.bbs_compra','cupom') IS NULL ALTER TABLE dbo.bbs_compra ADD cupom VARCHAR(30) NULL;
    IF COL_LENGTH('dbo.bbs_compra','acompanhamento') IS NULL ALTER TABLE dbo.bbs_compra ADD acompanhamento VARCHAR(36) NULL;
    EXEC('UPDATE dbo.bbs_compra SET acompanhamento=CONVERT(VARCHAR(36),NEWID()) WHERE acompanhamento IS NULL');
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='ux_compra_acompanhamento' AND object_id=OBJECT_ID('dbo.bbs_compra'))
        EXEC('CREATE UNIQUE INDEX ux_compra_acompanhamento ON dbo.bbs_compra(acompanhamento) WHERE acompanhamento IS NOT NULL');
    IF OBJECT_ID('dbo.bbs_cupom','U') IS NULL
        CREATE TABLE dbo.bbs_cupom (
            codigo VARCHAR(30) NOT NULL PRIMARY KEY,
            percentual INT NOT NULL CHECK(percentual BETWEEN 1 AND 50),
            limite_usos INT NOT NULL CHECK(limite_usos>0),
            usos INT NOT NULL,
            validade DATETIME2(6) NOT NULL,
            ativo BIT NOT NULL,
            CONSTRAINT ck_cupom_usos CHECK(usos>=0 AND usos<=limite_usos)
        );
    IF OBJECT_ID('dbo.bbs_avaliacao','U') IS NULL
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
    IF OBJECT_ID('dbo.bbs_carrinho_item','U') IS NULL
        CREATE TABLE dbo.bbs_carrinho_item (
            id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
            usuario_id BIGINT NOT NULL REFERENCES dbo.bbs_usuario(id),
            produto_id INT NOT NULL REFERENCES dbo.produto(id),
            quantidade INT NOT NULL CHECK(quantidade BETWEEN 1 AND 99),
            CONSTRAINT ux_carrinho_usuario_produto UNIQUE(usuario_id,produto_id)
        );
    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    THROW;
END CATCH;
GO
