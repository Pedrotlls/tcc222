package br.com.belval.bbs.service;
import br.com.belval.bbs.model.*;
import jakarta.persistence.*;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;
@Service
public class CarrinhoService {
    @PersistenceContext EntityManager em;
    private final CarrinhoEventos eventos;
    public CarrinhoService(CarrinhoEventos eventos){this.eventos=eventos;}
    public record Item(String name,BigDecimal price,String img,int qty,int max){}
    public record Carrinho(long versao,Map<Integer,Item> itens){}
    private List<CarrinhoItem> linhas(Long id){return em.createQuery("from CarrinhoItem where usuarioId=:id order by produtoId",CarrinhoItem.class).setParameter("id",id).getResultList();}
    @Transactional(readOnly=true) public Carrinho listar(Long id){
        Usuario u=em.find(Usuario.class,id);Map<Integer,Item> itens=new LinkedHashMap<>();
        for(CarrinhoItem linha:linhas(id)){
            Produto p=em.find(Produto.class,linha.produtoId);
            if(p!=null)itens.put(p.getId(),new Item(p.getNome(),p.getPreco(),p.getImgUrl(),linha.quantidade,Boolean.TRUE.equals(p.getAtivo())?Math.min(99,p.getEstoque()):0));
        }
        return new Carrinho(u.carrinhoVersao,itens);
    }
    @Transactional public Carrinho alterar(Long id,Integer produtoId,Integer delta){
        if(produtoId==null || delta==null || delta==0 || delta < -99 || delta > 99)throw erro("Alteração de quantidade inválida.");
        Usuario u=em.find(Usuario.class,id,LockModeType.PESSIMISTIC_WRITE);
        var linhas=linhas(id);CarrinhoItem item=linhas.stream().filter(i->i.produtoId.equals(produtoId)).findFirst().orElse(null);
        int quantidade=(item==null?0:item.quantidade)+delta;
        if(quantidade<=0){if(item!=null)em.remove(item);}
        else {
            Produto p=em.find(Produto.class,produtoId);
            if(p==null || !Boolean.TRUE.equals(p.getAtivo()) || quantidade>99 || quantidade>p.getEstoque())throw erro("Produto indisponível ou limite de estoque atingido.");
            if(item==null){if(linhas.size()>=100)throw erro("Limite de 100 produtos no carrinho.");item=new CarrinhoItem();item.usuarioId=id;item.produtoId=produtoId;item.quantidade=quantidade;em.persist(item);}
            item.quantidade=quantidade;
        }
        mudou(u);em.flush();return listar(id);
    }
    @Transactional public Carrinho importar(Long id,List<CompraService.Linha> itens){
        if(itens==null || itens.size()>100)throw erro("Carrinho inválido.");
        Usuario u=em.find(Usuario.class,id,LockModeType.PESSIMISTIC_WRITE);
        Map<Integer,CarrinhoItem> atuais=new TreeMap<>();for(var linha:linhas(id))atuais.put(linha.produtoId,linha);
        for(var linha:itens){
            if(linha==null || linha.produtoId()==null || linha.quantidade()==null || linha.quantidade()<1 || linha.quantidade()>99)throw erro("Quantidade inválida.");
            Produto p=em.find(Produto.class,linha.produtoId());
            if(p==null || !Boolean.TRUE.equals(p.getAtivo()) || p.getEstoque()<linha.quantidade())throw erro("Confira os produtos do carrinho antes de entrar na conta.");
            CarrinhoItem item=atuais.get(linha.produtoId());
            if(item==null){item=new CarrinhoItem();item.usuarioId=id;item.produtoId=p.getId();item.quantidade=linha.quantidade();atuais.put(p.getId(),item);em.persist(item);}
            else item.quantidade=Math.max(item.quantidade,linha.quantidade());
        }
        if(atuais.size()>100)throw erro("Limite de 100 produtos no carrinho.");
        mudou(u);em.flush();return listar(id);
    }
    @Transactional public void limpar(Long id){
        Usuario u=em.find(Usuario.class,id,LockModeType.PESSIMISTIC_WRITE);
        em.createQuery("delete from CarrinhoItem where usuarioId=:id").setParameter("id",id).executeUpdate();mudou(u);
    }
    private void mudou(Usuario u){
        u.carrinhoVersao++;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){
            @Override public void afterCommit(){eventos.avisar(u.id);}
        });
    }
    private ResponseStatusException erro(String msg){return new ResponseStatusException(HttpStatus.BAD_REQUEST,msg);}
}
