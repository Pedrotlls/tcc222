package br.com.belval.bbs.controller;

import br.com.belval.bbs.model.*;
import br.com.belval.bbs.repository.*;
import jakarta.persistence.*;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
@RequestMapping("/favoritos")
@Transactional
public class FavoritoController {
    private final UsuarioRepository usuarios;
    private final ProdutoRepository produtos;
    @PersistenceContext private EntityManager em;
    public FavoritoController(UsuarioRepository usuarios, ProdutoRepository produtos) {
        this.usuarios=usuarios; this.produtos=produtos;
    }
    private Usuario dono(Authentication auth, boolean lock) {
        Usuario u=usuarios.findByEmail(auth.getName()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if(lock) em.refresh(u,LockModeType.PESSIMISTIC_WRITE);
        return u;
    }
    private List<Produto> lista(Usuario u) {
        List<Produto> result=new ArrayList<>();
        produtos.findAllById(u.favoritos).forEach(result::add);
        result.sort(Comparator.comparing(Produto::getNome,String.CASE_INSENSITIVE_ORDER));
        return result;
    }
    @GetMapping public List<Produto> listar(Authentication auth) { return lista(dono(auth,false)); }
    @PutMapping("/{produtoId}")
    public List<Produto> adicionar(@PathVariable Integer produtoId,Authentication auth) {
        Usuario u=dono(auth,true);
        Produto p=em.find(Produto.class,produtoId,LockModeType.PESSIMISTIC_READ);
        if(p==null || !Boolean.TRUE.equals(p.getAtivo()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Produto indisponível para favoritar.");
        if(!u.favoritos.contains(produtoId) && u.favoritos.size()>=200)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Sua lista pode ter até 200 favoritos.");
        u.favoritos.add(produtoId);
        return lista(u);
    }
    @DeleteMapping("/{produtoId}")
    public List<Produto> remover(@PathVariable Integer produtoId,Authentication auth) {
        Usuario u=dono(auth,true);u.favoritos.remove(produtoId);return lista(u);
    }
}
