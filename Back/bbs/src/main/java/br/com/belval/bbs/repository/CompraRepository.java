package br.com.belval.bbs.repository;
import br.com.belval.bbs.model.Compra;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface CompraRepository extends JpaRepository<Compra,Long> {
    boolean existsByItensProdutoId(Integer produtoId);
    List<Compra> findByUsuarioIdOrderByIdDesc(Long usuarioId);
    List<Compra> findAllByOrderByIdDesc();
    Optional<Compra> findByUsuarioIdAndChave(Long usuarioId, String chave);
}
