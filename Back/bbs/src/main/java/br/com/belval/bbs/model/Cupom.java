package br.com.belval.bbs.model;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity @Table(name="bbs_cupom")
public class Cupom {
    @Id @Column(length=30) public String codigo;
    @Column(nullable=false) public int percentual;
    @Column(nullable=false) public int limiteUsos;
    @Column(nullable=false) public int usos;
    @Column(nullable=false) public LocalDateTime validade;
    @Column(nullable=false) public boolean ativo=true;
}
