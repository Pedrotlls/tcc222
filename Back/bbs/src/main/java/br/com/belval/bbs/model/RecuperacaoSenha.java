package br.com.belval.bbs.model;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity @Table(name="bbs_recuperacao_senha")
public class RecuperacaoSenha {
    @Id @Column(name="usuario_id") public Long usuarioId;
    @Column(nullable=false,length=64,unique=true) public String tokenHash;
    @Column(nullable=false,length=64) public String credencialHash;
    @Column(nullable=false) public LocalDateTime criadoEm;
    @Column(nullable=false) public LocalDateTime expiraEm;
    @Column(nullable=false) public boolean usado;
}
