package br.com.belval.bbs.controller;
import br.com.belval.bbs.model.*;
import br.com.belval.bbs.repository.*;
import br.com.belval.bbs.service.CompraService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController
public class CompraController {
    private final CompraService service;
    private final CompraRepository compras;
    private final UsuarioRepository usuarios;
    private final br.com.belval.bbs.repository.ProdutoRepository produtos;
    private final br.com.belval.bbs.service.FreteService fretes;
    public CompraController(CompraService service,CompraRepository compras,UsuarioRepository usuarios,
            br.com.belval.bbs.repository.ProdutoRepository produtos,br.com.belval.bbs.service.FreteService fretes) {
        this.service=service; this.compras=compras; this.usuarios=usuarios;this.produtos=produtos;this.fretes=fretes;
    }
    @GetMapping("/pedidos") public List<Compra> meus(Authentication a){return service.listar(a.getName());}
    @PostMapping("/pedidos") @ResponseStatus(HttpStatus.CREATED)
    public Compra criar(@RequestBody CompraService.Pedido p,Authentication a){return service.criar(a.getName(),p);}
    public record CotacaoPedido(List<CompraService.Linha> itens,String uf,String entrega){}
    @PostMapping("/frete/cotacao")
    public br.com.belval.bbs.service.FreteService.Cotacao cotar(@RequestBody CotacaoPedido dados) {
        if(dados.itens()==null || dados.itens().isEmpty() || dados.itens().size()>100)
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,"Carrinho invalido.");
        java.math.BigDecimal subtotal=java.math.BigDecimal.ZERO;
        int quantidade=0;
        java.util.Map<Integer,Integer> linhas=new java.util.TreeMap<>();
        for(var linha:dados.itens()) {
            if(linha==null || linha.produtoId()==null || linha.quantidade()==null || linha.quantidade()<1 || linha.quantidade()>99)
                throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,"Quantidade invalida.");
            linhas.merge(linha.produtoId(),linha.quantidade(),Integer::sum);
        }
        for(var linha:linhas.entrySet()) {
            if(linha.getValue()>99)
                throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,"Quantidade invalida.");
            var p=produtos.findById(linha.getKey()).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,"Produto indisponivel."));
            if(!Boolean.TRUE.equals(p.getAtivo()) || p.getEstoque()==null || p.getEstoque()<linha.getValue() ||
                    p.getPreco()==null || p.getPreco().signum()<0)
                throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,"Produto indisponivel ou estoque insuficiente.");
            subtotal=subtotal.add(p.getPreco().multiply(java.math.BigDecimal.valueOf(linha.getValue())));
            quantidade+=linha.getValue();
        }
        return fretes.calcular(subtotal,quantidade,dados.uf(),dados.entrega());
    }
    @PatchMapping("/pedidos/{id}/cancelar")
    public Compra cancelar(@PathVariable Long id,Authentication a){return service.status(id,"CANCELADO",a.getName(),false);}
    @GetMapping("/admin/pedidos") public List<Compra> todos(){return compras.findAllByOrderByIdDesc();}
    @GetMapping("/admin/clientes") public List<Usuario> clientes(){return usuarios.findAll();}
    public record Status(String status){}
    @PatchMapping("/admin/pedidos/{id}/status")
    public Compra status(@PathVariable Long id,@RequestBody Status s,Authentication a){return service.status(id,s.status(),a.getName(),true);}
}
