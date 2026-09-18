package br.com.belval.bbs.service;
import br.com.belval.bbs.model.*;
import br.com.belval.bbs.repository.*;
import jakarta.persistence.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.*;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class CompraService {
    private final CompraRepository compras;
    private final UsuarioRepository usuarios;
    private final FreteService fretes;
    private final EnderecoService enderecos;
    @PersistenceContext private EntityManager em;
    public CompraService(CompraRepository compras, UsuarioRepository usuarios, FreteService fretes, EnderecoService enderecos) {
        this.compras=compras; this.usuarios=usuarios; this.fretes=fretes; this.enderecos=enderecos;
    }
    public record Linha(Integer produtoId, Integer quantidade) {}
    public record Endereco(String cep,String rua,String numero,String complemento,String bairro,String cidade,String uf) {}
    public record Pedido(List<Linha> itens, Endereco endereco, String entrega, String pagamento, String chave, Long enderecoId) {}
    public Usuario usuario(String email) {
        return usuarios.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
    public List<Compra> listar(String email) {
        return compras.findByUsuarioIdOrderByIdDesc(usuario(email).id);
    }
    // Preco, frete, desconto, dono e status nunca sao aceitos do navegador.
    @Transactional
    public Compra criar(String email, Pedido pedido) {
        Usuario user = usuario(email);
        // Serializa retries do mesmo usuario; evita pedidos duplicados por duplo clique.
        em.find(Usuario.class,user.id,LockModeType.PESSIMISTIC_WRITE);
        if (pedido.chave()==null || !pedido.chave().matches("[a-zA-Z0-9-]{8,80}"))
            throw erro("Identificador de compra invalido.");
        var existente=compras.findByUsuarioIdAndChave(user.id,pedido.chave());
        if(existente.isPresent()) return existente.get();
        if(pedido.itens()==null || pedido.itens().isEmpty() || pedido.itens().size()>100)
            throw erro("O carrinho precisa ter de 1 a 100 itens.");
        if(!Set.of("normal","expresso").contains(Objects.toString(pedido.entrega(),"")))
            throw erro("Selecione a entrega.");
        if(!Set.of("pix","boleto","credito","debito").contains(Objects.toString(pedido.pagamento(),"")))
            throw erro("Selecione o pagamento demonstrativo.");
        Endereco e=pedido.endereco();
        if(pedido.enderecoId()!=null) {
            EnderecoSalvo salvo=enderecos.obter(pedido.enderecoId(),user.id);
            e=new Endereco(salvo.cep,salvo.rua,salvo.numero,salvo.complemento,salvo.bairro,salvo.cidade,salvo.uf);
        }
        if(e==null || e.cep()==null || !e.cep().matches("[0-9]{8}") ||
            !texto(e.rua(),2,120) || !texto(e.numero(),1,20) || !texto(e.bairro(),2,80) ||
            !texto(e.cidade(),2,80) || e.uf()==null ||
            !Set.of("AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO").contains(e.uf()) ||
            (e.complemento()!=null && e.complemento().length()>100))
            throw erro("Preencha um endereco valido, com CEP, rua, numero, bairro, cidade e UF.");
        Compra c=new Compra(); c.usuarioId=user.id; c.clienteNome=user.nome; c.clienteEmail=user.email;
        c.chave=pedido.chave(); c.criadoEm=LocalDateTime.now(); c.status="RECEBIDO";
        c.historico.add(new Compra.Evento(c.status,"CLIENTE",c.criadoEm));
        c.pagamento=pedido.pagamento(); c.entrega=pedido.entrega();
        c.endereco=e.rua()+", "+e.numero()+" "+Objects.toString(e.complemento(),"")+" — "+e.bairro()+", "+e.cidade()+"/"+e.uf()+" — "+e.cep();
        c.subtotal=BigDecimal.ZERO;
        Map<Integer,Integer> quantidades=new TreeMap<>();
        for(Linha linha:pedido.itens()) {
            if(linha==null || linha.produtoId()==null || linha.produtoId()<=0 ||
               linha.quantidade()==null || linha.quantidade()<1 || linha.quantidade()>99)
                throw erro("Quantidade invalida (1 a 99).");
            quantidades.merge(linha.produtoId(),linha.quantidade(),Integer::sum);
        }
        // IDs ordenados evitam adquirir locks em ordens diferentes.
        for(var linha:quantidades.entrySet()) {
            int qtd=linha.getValue();
            Produto p=em.find(Produto.class,linha.getKey(),LockModeType.PESSIMISTIC_WRITE);
            if(qtd>99 || p==null || !Boolean.TRUE.equals(p.getAtivo()) ||
               p.getEstoque()==null || p.getEstoque()<qtd || p.getPreco()==null || p.getPreco().signum()<0)
                throw erro("Produto indisponivel ou estoque insuficiente: "+linha.getKey());
            c.itens.add(new Compra.Item(p,qtd));
            c.subtotal=c.subtotal.add(p.getPreco().multiply(BigDecimal.valueOf(qtd)));
            p.setEstoque(p.getEstoque()-qtd);
        }
        int quantidadeTotal=c.itens.stream().mapToInt(item -> item.quantidade).sum();
        c.frete=fretes.calcular(c.subtotal,quantidadeTotal,e.uf(),pedido.entrega()).valor();
        BigDecimal taxa=new BigDecimal(pedido.pagamento().equals("pix")?"0.10":pedido.pagamento().equals("boleto")?"0.07":"0");
        c.desconto=c.subtotal.multiply(taxa).setScale(2,RoundingMode.HALF_UP);
        c.total=c.subtotal.add(c.frete).subtract(c.desconto).setScale(2,RoundingMode.HALF_UP);
        return compras.save(c);
    }
    @Transactional
    public Compra status(Long id, String status, String email, boolean admin) {
        Compra c=em.find(Compra.class,id,LockModeType.PESSIMISTIC_WRITE);
        if(c==null || (!admin && !c.usuarioId.equals(usuario(email).id)))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Pedido nao encontrado.");
        if(Objects.equals(c.status,status)) return c;
        Map<String,Set<String>> proximos=Map.of(
            "RECEBIDO",Set.of("SEPARANDO","CANCELADO"),
            "SEPARANDO",Set.of("ENVIADO","CANCELADO"),
            "ENVIADO",Set.of("ENTREGUE"), "ENTREGUE",Set.of(), "CANCELADO",Set.of());
        if(status==null || (!admin && (!status.equals("CANCELADO") || !c.status.equals("RECEBIDO"))) ||
            !proximos.getOrDefault(c.status,Set.of()).contains(status))
            throw erro("Alteracao de status nao permitida.");
        if(status.equals("CANCELADO")) {
            for(Compra.Item item:c.itens.stream().sorted(Comparator.comparing(i->i.produtoId)).toList()) {
                Produto p=em.find(Produto.class,item.produtoId,LockModeType.PESSIMISTIC_WRITE);
                if(p!=null) p.setEstoque(p.getEstoque()+item.quantidade);
            }
        }
        if(c.historico.isEmpty()) c.historico.add(new Compra.Evento(c.status,"IMPORTADO",null));
        c.status=status;
        c.historico.add(new Compra.Evento(status,admin?"ADMIN":"CLIENTE",LocalDateTime.now()));
        return c;
    }
    private boolean texto(String s,int min,int max){return s!=null && s.trim().length()>=min && s.length()<=max;}
    private ResponseStatusException erro(String s){return new ResponseStatusException(HttpStatus.BAD_REQUEST,s);}
}
