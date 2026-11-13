package br.com.belval.bbs.controller;
import br.com.belval.bbs.model.*;
import br.com.belval.bbs.repository.UsuarioRepository;
import jakarta.persistence.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;

/**
 * Feedback dos produtos: avaliações (nota + comentário), votos de utilidade,
 * resumo de notas para o catálogo e moderação pelo administrador.
 *
 * Regras:
 * - Listar e ver o resumo é público; avaliar exige compra não cancelada do produto.
 * - Cada cliente tem no máximo uma avaliação por produto (reenviar atualiza) e pode excluí-la.
 * - Cada cliente vota uma vez por avaliação (útil / não útil) e não vota na própria.
 * - O administrador lista e remove avaliações em /admin/avaliacoes.
 */
@RestController
public class AvaliacaoController {
    @PersistenceContext EntityManager em;
    private final UsuarioRepository usuarios;
    public AvaliacaoController(UsuarioRepository usuarios){this.usuarios=usuarios;}

    // ---------- Registros devolvidos pela API (nunca expõem usuarioId nem e-mail) ----------
    public record Publica(Long id,String autor,int nota,String comentario,LocalDateTime criadoEm,
                          long uteis,long naoUteis,Boolean meuVoto,boolean minha){}
    public record Resumo(Integer produtoId,double media,long total){}
    public record Votos(long uteis,long naoUteis,Boolean meuVoto){}
    public record Admin(Long id,Integer produtoId,String produto,String autor,int nota,String comentario,
                        LocalDateTime criadoEm,long uteis,long naoUteis){}
    public record Dados(Integer nota,String comentario){}
    public record Voto(Boolean util){}

    // ---------- Utilidades ----------
    /** Cliente autenticado, se houver; endpoints públicos continuam funcionando sem login. */
    private Optional<Usuario> atual(){
        var a=SecurityContextHolder.getContext().getAuthentication();
        if(a==null || a instanceof AnonymousAuthenticationToken || !a.isAuthenticated())return Optional.empty();
        return usuarios.findByEmail(a.getName());
    }
    private Usuario exigirUsuario(){
        return atual().orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Entre na sua conta para continuar."));
    }
    /** [0]=úteis, [1]=não úteis, por id de avaliação. */
    private Map<Long,long[]> contagem(Collection<Long> ids){
        Map<Long,long[]> mapa=new HashMap<>();
        if(ids.isEmpty())return mapa;
        for(Object[] r:em.createQuery("select v.avaliacaoId,v.util,count(v) from AvaliacaoVoto v where v.avaliacaoId in :ids group by v.avaliacaoId,v.util",Object[].class)
                .setParameter("ids",ids).getResultList())
            mapa.computeIfAbsent((Long)r[0],k->new long[2])[(Boolean)r[1]?0:1]=(Long)r[2];
        return mapa;
    }
    private Votos votos(Long avaliacaoId,Long usuarioId){
        long[] c=contagem(List.of(avaliacaoId)).getOrDefault(avaliacaoId,new long[2]);
        Boolean meu=em.createQuery("select v.util from AvaliacaoVoto v where v.avaliacaoId=:a and v.usuarioId=:u",Boolean.class)
            .setParameter("a",avaliacaoId).setParameter("u",usuarioId).getResultStream().findFirst().orElse(null);
        return new Votos(c[0],c[1],meu);
    }
    private void apagar(Avaliacao a){
        em.createQuery("delete from AvaliacaoVoto v where v.avaliacaoId=:id").setParameter("id",a.id).executeUpdate();
        em.remove(a);
    }

    // ---------- Público ----------
    @GetMapping("/avaliacoes/{produtoId}") @Transactional(readOnly=true)
    public List<Publica> listar(@PathVariable Integer produtoId,@RequestParam(defaultValue="recentes") String ordem){
        if(!ordem.equals("recentes") && !ordem.equals("uteis"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Ordem inválida.");
        List<Avaliacao> lista=em.createQuery("from Avaliacao where produtoId=:id order by criadoEm desc,id desc",Avaliacao.class)
            .setParameter("id",produtoId).setMaxResults(100).getResultList();
        Map<Long,long[]> contagem=contagem(lista.stream().map(a->a.id).toList());
        Optional<Usuario> eu=atual();
        Map<Long,Boolean> meusVotos=new HashMap<>();
        if(eu.isPresent() && !lista.isEmpty())
            for(Object[] r:em.createQuery("select v.avaliacaoId,v.util from AvaliacaoVoto v where v.usuarioId=:u and v.avaliacaoId in :ids",Object[].class)
                    .setParameter("u",eu.get().id).setParameter("ids",lista.stream().map(a->a.id).toList()).getResultList())
                meusVotos.put((Long)r[0],(Boolean)r[1]);
        List<Publica> saida=new ArrayList<>();
        for(Avaliacao a:lista){
            long[] c=contagem.getOrDefault(a.id,new long[2]);
            saida.add(new Publica(a.id,a.autor,a.nota,a.comentario,a.criadoEm,c[0],c[1],meusVotos.get(a.id),
                eu.isPresent() && eu.get().id.equals(a.usuarioId)));
        }
        // Mais úteis: saldo de votos, depois quantidade de úteis; empate mantém a ordem mais recente.
        if(ordem.equals("uteis"))
            saida.sort(Comparator.comparingLong((Publica p)->p.uteis()-p.naoUteis()).reversed().thenComparing(Comparator.comparingLong(Publica::uteis).reversed()));
        return saida;
    }
    /** Média e total por produto, para exibir estrelas no catálogo com uma única chamada. */
    @GetMapping("/avaliacoes/resumo") @Transactional(readOnly=true)
    public List<Resumo> resumo(){
        return em.createQuery("select a.produtoId,avg(a.nota),count(a) from Avaliacao a group by a.produtoId order by a.produtoId",Object[].class)
            .getResultList().stream().map(r->new Resumo((Integer)r[0],Math.round(((Number)r[1]).doubleValue()*10)/10.0,(Long)r[2])).toList();
    }

    // ---------- Cliente autenticado ----------
    @PutMapping("/avaliacoes/{produtoId}") @Transactional
    public Publica avaliar(@PathVariable Integer produtoId,@RequestBody Dados dados){
        if(dados.nota()==null || dados.nota()<1 || dados.nota()>5 || dados.comentario()==null || dados.comentario().isBlank() || dados.comentario().length()>1000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Informe nota de 1 a 5 e comentário até 1.000 caracteres.");
        Usuario u=exigirUsuario();
        em.find(Usuario.class,u.id,LockModeType.PESSIMISTIC_WRITE);
        long comprou=em.createQuery("select count(c) from Compra c join c.itens i where c.usuarioId=:usuario and i.produtoId=:produto and c.status <> 'CANCELADO'",Long.class)
            .setParameter("usuario",u.id).setParameter("produto",produtoId).getSingleResult();
        if(comprou==0)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Avaliações são permitidas após registrar uma compra deste produto.");
        Avaliacao a=em.createQuery("from Avaliacao where usuarioId=:u and produtoId=:p",Avaliacao.class).setParameter("u",u.id).setParameter("p",produtoId)
            .getResultStream().findFirst().orElseGet(Avaliacao::new);
        a.usuarioId=u.id;a.produtoId=produtoId;a.autor=u.nome.split(" ")[0];a.nota=dados.nota();a.comentario=dados.comentario().trim();a.criadoEm=LocalDateTime.now(ZoneOffset.UTC);
        if(a.id==null)em.persist(a);
        long[] c=contagem(List.of(a.id)).getOrDefault(a.id,new long[2]);
        return new Publica(a.id,a.autor,a.nota,a.comentario,a.criadoEm,c[0],c[1],null,true);
    }
    /** O cliente exclui a própria avaliação do produto; votos associados também são removidos. */
    @DeleteMapping("/avaliacoes/{produtoId}") @Transactional @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluirMinha(@PathVariable Integer produtoId){
        Usuario u=exigirUsuario();
        em.find(Usuario.class,u.id,LockModeType.PESSIMISTIC_WRITE);
        Avaliacao a=em.createQuery("from Avaliacao where usuarioId=:u and produtoId=:p",Avaliacao.class).setParameter("u",u.id).setParameter("p",produtoId)
            .getResultStream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Você ainda não avaliou este produto."));
        apagar(a);
    }
    /** Define ou troca o voto; repetir o mesmo voto não duplica (um por cliente/avaliação). */
    @PutMapping("/avaliacoes/{id}/voto") @Transactional
    public Votos votar(@PathVariable Long id,@RequestBody Voto dados){
        if(dados.util()==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Informe se a avaliação foi útil.");
        Usuario u=exigirUsuario();
        em.find(Usuario.class,u.id,LockModeType.PESSIMISTIC_WRITE);
        Avaliacao a=em.find(Avaliacao.class,id);
        if(a==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Avaliação não encontrada.");
        if(a.usuarioId.equals(u.id))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Você não pode votar na sua própria avaliação.");
        AvaliacaoVoto v=em.createQuery("from AvaliacaoVoto where avaliacaoId=:a and usuarioId=:u",AvaliacaoVoto.class).setParameter("a",id).setParameter("u",u.id)
            .getResultStream().findFirst().orElseGet(AvaliacaoVoto::new);
        v.avaliacaoId=id;v.usuarioId=u.id;v.util=dados.util();v.criadoEm=LocalDateTime.now(ZoneOffset.UTC);
        if(v.id==null)em.persist(v);
        em.flush();
        return votos(id,u.id);
    }
    @DeleteMapping("/avaliacoes/{id}/voto") @Transactional
    public Votos removerVoto(@PathVariable Long id){
        Usuario u=exigirUsuario();
        em.find(Usuario.class,u.id,LockModeType.PESSIMISTIC_WRITE);
        if(em.find(Avaliacao.class,id)==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Avaliação não encontrada.");
        em.createQuery("delete from AvaliacaoVoto v where v.avaliacaoId=:a and v.usuarioId=:u").setParameter("a",id).setParameter("u",u.id).executeUpdate();
        return votos(id,u.id);
    }

    // ---------- Administração (/admin/** exige perfil ADMIN na SecurityConfig) ----------
    @GetMapping("/admin/avaliacoes") @Transactional(readOnly=true)
    public List<Admin> moderar(@RequestParam(required=false) Integer produtoId,@RequestParam(required=false) Integer nota){
        if(nota!=null && (nota<1 || nota>5))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Nota deve estar entre 1 e 5.");
        String jpql="select a,p.nome from Avaliacao a,Produto p where a.produtoId=p.id"+(produtoId!=null?" and a.produtoId=:produto":"")+(nota!=null?" and a.nota=:nota":"")+" order by a.criadoEm desc,a.id desc";
        var q=em.createQuery(jpql,Object[].class);
        if(produtoId!=null)q.setParameter("produto",produtoId);
        if(nota!=null)q.setParameter("nota",nota);
        List<Object[]> linhas=q.setMaxResults(300).getResultList();
        Map<Long,long[]> contagem=contagem(linhas.stream().map(r->((Avaliacao)r[0]).id).toList());
        return linhas.stream().map(r->{
            Avaliacao a=(Avaliacao)r[0];long[] c=contagem.getOrDefault(a.id,new long[2]);
            return new Admin(a.id,a.produtoId,(String)r[1],a.autor,a.nota,a.comentario,a.criadoEm,c[0],c[1]);
        }).toList();
    }
    @DeleteMapping("/admin/avaliacoes/{id}") @Transactional @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remover(@PathVariable Long id){
        Avaliacao a=em.find(Avaliacao.class,id);
        if(a==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Avaliação não encontrada.");
        apagar(a);
    }
}
