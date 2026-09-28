-- Pare a API. Execute depois de 01, 03 e 04. Pode repetir sem apagar contas.
USE apibbs;
GO
SET XACT_ABORT ON;
BEGIN TRY
    IF OBJECT_ID(N'dbo.bbs_usuario',N'U') IS NULL
        THROW 50001, 'Execute primeiro 01_criar_banco.sql.', 1;
    BEGIN TRANSACTION;
    IF OBJECT_ID(N'dbo.bbs_sessao_token',N'U') IS NULL
    BEGIN
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
        CREATE INDEX ix_sessao_familia ON dbo.bbs_sessao_token(familia);
        CREATE INDEX ix_sessao_usuario ON dbo.bbs_sessao_token(usuario_id);
        CREATE INDEX ix_sessao_expira ON dbo.bbs_sessao_token(expira_em);
    END;
    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    THROW;
END CATCH;
GO
