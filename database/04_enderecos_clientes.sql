-- API parada. Preserva os dados existentes. Pode executar novamente.
USE apibbs;
GO
SET XACT_ABORT ON;
BEGIN TRY
    IF OBJECT_ID(N'dbo.bbs_usuario',N'U') IS NULL
        THROW 50001, 'Execute primeiro 01_criar_banco.sql e 03_atualizar_funcionalidades.sql.', 1;
    BEGIN TRANSACTION;
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
    IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='ux_endereco_principal' AND object_id=OBJECT_ID('dbo.bbs_endereco'))
        CREATE UNIQUE INDEX ux_endereco_principal ON dbo.bbs_endereco(usuario_id) WHERE principal=1;
    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    THROW;
END CATCH;
GO
