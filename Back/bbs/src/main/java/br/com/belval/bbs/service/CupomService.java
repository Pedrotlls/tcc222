package br.com.belval.bbs.service;
import br.com.belval.bbs.model.*;
import jakarta.persistence.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.math.*;
import java.time.*;
import java.util.*;
@Service
public class CupomService {
    @PersistenceContext EntityManager em;
    public record Dados(String codigo,Integer percentual,Integer limiteUsos,LocalDateTime validade){}
    @Transactional public Cupom criar(Dados d){
        String codigo=normalizar(d.codigo());
        if(!codigo.matches("[A-Z0-9-]{3,30}") || d.percentual()==null || d.percentual()<1 || d.percentual()>50 || d.limiteUsos()==null || d.limiteUsos()<1 || d.limiteUsos()>1000000 || d.validade()==null || !d.validade().isAfter(LocalDateTime.now(ZoneOffset.UTC)))throw erro("Informe código, desconto de 1 a 50%, limite e validade futura.");
        if(em.find(Cupom.class,codigo)!=null)throw erro("Código já cadastrado.");
        Cupom c=new Cupom();c.codigo=codigo;c.percentual=d.percentual();c.limiteUsos=d.limiteUsos();c.validade=d.validade();em.persist(c);return c;
    }
    @Transactional public Cupom ativar(String codigo,boolean ativo){
        Cupom c=em.find(Cupom.class,normalizar(codigo),LockModeType.PESSIMISTIC_WRITE);
        if(c==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND);c.ativo=ativo;return c;
    }
    @Transactional(readOnly=true) public List<Cupom> listar(){return em.createQuery("from Cupom order by validade desc",Cupom.class).getResultList();}
    @Transactional public BigDecimal desconto(String codigo,BigDecimal subtotal,boolean consumir){
        Cupom c=consumir?em.find(Cupom.class,normalizar(codigo),LockModeType.PESSIMISTIC_WRITE):em.find(Cupom.class,normalizar(codigo));
        if(c==null || !c.ativo || !c.validade.isAfter(LocalDateTime.now(ZoneOffset.UTC)) || c.usos>=c.limiteUsos)throw erro("Cupom inválido, vencido ou esgotado.");
        if(consumir)c.usos++;
        return subtotal.multiply(BigDecimal.valueOf(c.percentual)).divide(BigDecimal.valueOf(100),2,RoundingMode.HALF_UP);
    }
    @Transactional(readOnly=true) public BigDecimal cotar(String codigo,List<CompraService.Linha> itens){
        if(itens==null || itens.isEmpty() || itens.size()>100)throw erro("Carrinho inválido.");
        BigDecimal subtotal=BigDecimal.ZERO;Map<Integer,Integer> quantidades=new TreeMap<>();
        for(var i:itens){if(i==null || i.produtoId()==null || i.quantidade()==null || i.quantidade()<1 || i.quantidade()>99)throw erro("Quantidade inválida.");quantidades.merge(i.produtoId(),i.quantidade(),Integer::sum);}
        for(var i:quantidades.entrySet()){
            Produto p=em.find(Produto.class,i.getKey());
            if(p==null || !Boolean.TRUE.equals(p.getAtivo()) || i.getValue()>99 || p.getEstoque()<i.getValue())throw erro("Produto indisponível.");
            subtotal=subtotal.add(p.getPreco().multiply(BigDecimal.valueOf(i.getValue())));
        }
        return desconto(codigo,subtotal,false);
    }
    public static String normalizar(String codigo){return codigo==null?"":codigo.trim().toUpperCase(Locale.ROOT);}
    private ResponseStatusException erro(String m){return new ResponseStatusException(HttpStatus.BAD_REQUEST,m);}
}
