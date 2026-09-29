package br.com.belval.bbs.model;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity @Table(name="bbs_endereco")
public class EnderecoSalvo {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @JsonIgnore @Column(nullable=false) public Long usuarioId;
    @Column(nullable=false,length=40) public String apelido;
    @Column(nullable=false,length=8) public String cep;
    @Column(nullable=false,length=120) public String rua;
    @Column(nullable=false,length=20) public String numero;
    @Column(length=100) public String complemento;
    @Column(nullable=false,length=80) public String bairro;
    @Column(nullable=false,length=80) public String cidade;
    @Column(nullable=false,length=2) public String uf;
    @Column(nullable=false) public boolean principal;
}
