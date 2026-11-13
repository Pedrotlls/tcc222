package br.com.belval.bbs.model;
import jakarta.persistence.*;
import java.time.LocalDateTime;
/** Voto "útil" (true) ou "não útil" (false) de um cliente em uma avaliação. Um voto por cliente/avaliação. */
@Entity @Table(name="bbs_avaliacao_voto",uniqueConstraints=@UniqueConstraint(columnNames={"avaliacao_id","usuario_id"}))
public class AvaliacaoVoto {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @Column(nullable=false) public Long avaliacaoId;
    @Column(nullable=false) public Long usuarioId;
    @Column(nullable=false) public boolean util;
    @Column(nullable=false) public LocalDateTime criadoEm;
}
