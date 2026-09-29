USE apibbs;
GO
IF OBJECT_ID(N'dbo.bbs_recuperacao_senha',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.bbs_recuperacao_senha (
        usuario_id BIGINT NOT NULL PRIMARY KEY,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        credencial_hash VARCHAR(64) NOT NULL,
        criado_em DATETIME2 NOT NULL,
        expira_em DATETIME2 NOT NULL,
        usado BIT NOT NULL DEFAULT 0,
        CONSTRAINT fk_recuperacao_usuario FOREIGN KEY(usuario_id) REFERENCES dbo.bbs_usuario(id)
    );
END;
GO
