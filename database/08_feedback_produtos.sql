-- API parada. Execute depois dos scripts 01, 03, 04, 05, 06 e 07. Migração repetível.
-- Feedback dos produtos: votos "útil / não útil" nas avaliações (tabela bbs_avaliacao_voto).
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
    IF OBJECT_ID('dbo.bbs_avaliacao_voto','U') IS NULL
        CREATE TABLE dbo.bbs_avaliacao_voto (
            id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
            avaliacao_id BIGINT NOT NULL REFERENCES dbo.bbs_avaliacao(id),
            usuario_id BIGINT NOT NULL REFERENCES dbo.bbs_usuario(id),
            util BIT NOT NULL,
            criado_em DATETIME2(6) NOT NULL,
            CONSTRAINT ux_avaliacao_voto_usuario UNIQUE(avaliacao_id,usuario_id)
        );
    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    THROW;
END CATCH;
GO
