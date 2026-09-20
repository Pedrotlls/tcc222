package br.com.belval.bbs.model;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
/** Snapshot: o historico nao muda se nome ou preco do produto forem alterados. */
@Entity @Table(name="bbs_compra", uniqueConstraints=@UniqueConstraint(columnNames={"usuario_id","chave"}))
public class Compra {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @Column(name="usuario_id",nullable=false) public Long usuarioId;
    @Column(nullable=false, length=80) public String chave;
    public String clienteNome;
    public String clienteEmail;
    public LocalDateTime criadoEm;
    public String status;
    public String pagamento;
    public String entrega;
    @Column(length=600) public String endereco;
    @Column(precision=16,scale=2) public BigDecimal subtotal;
    @Column(precision=16,scale=2) public BigDecimal frete;
    @Column(precision=16,scale=2) public BigDecimal desconto;
    @Column(precision=16,scale=2) public BigDecimal total;
    @ElementCollection(fetch=FetchType.EAGER)
    @CollectionTable(name="bbs_compra_item", joinColumns=@JoinColumn(name="compra_id"))
    public List<Item> itens = new ArrayList<>();
    @ElementCollection(fetch=FetchType.EAGER)
    @CollectionTable(name="bbs_compra_historico", joinColumns=@JoinColumn(name="compra_id"))
    @OrderColumn(name="ordem")
    @org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SELECT)
    public List<Evento> historico = new ArrayList<>();
    @Embeddable
    public static class Evento {
        @Column(nullable=false,length=30) public String status;
        public LocalDateTime ocorridoEm;
        @Column(nullable=false,length=20) public String origem;
        public Evento() {}
        public Evento(String status,String origem,LocalDateTime ocorridoEm) {
            this.status=status;this.origem=origem;this.ocorridoEm=ocorridoEm;
        }
    }
    @Embeddable
    public static class Item {
        public Integer produtoId;
        public String nome;
        public Integer quantidade;
        @Column(precision=16,scale=2) public BigDecimal preco;
        public Item() {}
        public Item(Produto p, int qtd) {
            produtoId=p.getId(); nome=p.getNome(); preco=p.getPreco(); quantidade=qtd;
        }
    }
    public Compra() {}
}
