package br.com.belval.bbs.model;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
/** Conta de acesso: o hash nunca e devolvido na API. */
@Entity @Table(name = "bbs_usuario")
public class Usuario {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(nullable = false, length = 100) public String nome;
    @Column(nullable = false, unique = true, length = 150) public String email;
    @JsonIgnore @Column(nullable = false) public String senhaHash;
    @Column(nullable = false) public String perfil = "CLIENTE";
    public Usuario() {}
}
