package br.com.belval.bbs.model;
import jakarta.persistence.*;
import java.time.LocalDateTime;
/** Somente hashes são persistidos. Nunca serializar esta entidade na API. */
@Entity @Table(name="bbs_sessao_token")
public class SessaoToken {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @ManyToOne(optional=false) @JoinColumn(name="usuario_id",nullable=false) public Usuario usuario;
    @Column(nullable=false,length=36) public String familia;
    @Column(nullable=false,unique=true,length=64) public String acessoHash;
    @Column(nullable=false,unique=true,length=64) public String renovacaoHash;
    @Column(nullable=false,length=64) public String credencialHash;
    @Column(nullable=false) public LocalDateTime criadoEm;
    @Column(nullable=false) public LocalDateTime acessoExpiraEm;
    @Column(nullable=false) public LocalDateTime expiraEm;
    @Column(nullable=false) public boolean revogado;
}
