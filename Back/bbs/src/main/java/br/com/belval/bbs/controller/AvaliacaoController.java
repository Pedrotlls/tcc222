package br.com.belval.bbs.controller;
import br.com.belval.bbs.model.*;
import br.com.belval.bbs.repository.UsuarioRepository;
import jakarta.persistence.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;
@RestController @RequestMapping("/avaliacoes")
public class AvaliacaoController {
    @PersistenceContext EntityManager em;
    private final UsuarioRepository usuarios;
    public AvaliacaoController(UsuarioRepository usuarios){this.usuarios=usuarios;}
    public record Publica(Long id,String autor,int nota,String comentario,LocalDateTime criadoEm){}
    private Publica publica(Avaliacao a){return new Publica(a.id,a.autor,a.nota,a.comentario,a.criadoEm);}
    @GetMapping("/{produtoId}") @Transactional(readOnly=true)
    public List<Publica> listar(@PathVariable Integer produtoId){
        return em.createQuery("from Avaliacao where produtoId=:id order by criadoEm desc",Avaliacao.class).setParameter("id",produtoId).setMaxResults(100).getResultList().stream().map(this::publica).toList();
    }
    public record Dados(Integer nota,String comentario){}
    @PutMapping("/{produtoId}") @Transactional
    public Publica avaliar(@PathVariable Integer produtoId,@RequestBody Dados dados,Authentication auth){
        if(dados.nota()==null || dados.nota()<1 || dados.nota()>5 || dados.comentario()==null || dados.comentario().isBlank() || dados.comentario().length()>1000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Informe nota de 1 a 5 e comentário até 1.000 caracteres.");
        Usuario u=usuarios.findByEmail(auth.getName()).orElseThrow();em.find(Usuario.class,u.id,LockModeType.PESSIMISTIC_WRITE);
        long comprou=em.createQuery("select count(c) from Compra c join c.itens i where c.usuarioId=:usuario and i.produtoId=:produto and c.status <> 'CANCELADO'",Long.class).setParameter("usuario",u.id).setParameter("produto",produtoId).getSingleResult();
        if(comprou==0)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Avaliações são permitidas após registrar uma compra deste produto.");
        Avaliacao a=em.createQuery("from Avaliacao where usuarioId=:u and produtoId=:p",Avaliacao.class).setParameter("u",u.id).setParameter("p",produtoId).getResultStream().findFirst().orElseGet(Avaliacao::new);
        a.usuarioId=u.id;a.produtoId=produtoId;a.autor=u.nome.split(" ")[0];a.nota=dados.nota();a.comentario=dados.comentario().trim();a.criadoEm=LocalDateTime.now(ZoneOffset.UTC);
        if(a.id==null)em.persist(a);return publica(a);
    }
}
