package br.com.belval.bbs.model;
import jakarta.persistence.*;
@Entity @Table(name="bbs_carrinho_item",uniqueConstraints=@UniqueConstraint(columnNames={"usuario_id","produto_id"}))
public class CarrinhoItem {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @Column(nullable=false) public Long usuarioId;
    @Column(nullable=false) public Integer produtoId;
    @Column(nullable=false) public int quantidade;
}
