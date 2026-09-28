package br.com.belval.bbs.model;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity @Table(name="bbs_avaliacao",uniqueConstraints=@UniqueConstraint(columnNames={"usuario_id","produto_id"}))
public class Avaliacao {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @Column(nullable=false) public Long usuarioId;
    @Column(nullable=false) public Integer produtoId;
    @Column(nullable=false,length=100) public String autor;
    @Column(nullable=false) public int nota;
    @Column(nullable=false,length=1000) public String comentario;
    @Column(nullable=false) public LocalDateTime criadoEm;
}
