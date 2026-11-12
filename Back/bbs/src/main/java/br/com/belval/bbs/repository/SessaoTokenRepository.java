package br.com.belval.bbs.repository;
import br.com.belval.bbs.model.SessaoToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.*;
public interface SessaoTokenRepository extends JpaRepository<SessaoToken,Long> {
    @EntityGraph(attributePaths="usuario") Optional<SessaoToken> findByAcessoHash(String hash);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SessaoToken s where s.renovacaoHash = :hash")
    Optional<SessaoToken> bloquearRenovacao(@Param("hash") String hash);
    @Modifying @Query("update SessaoToken s set s.revogado=true where s.familia=:familia")
    void revogarFamilia(@Param("familia") String familia);
    @Modifying @Query("update SessaoToken s set s.revogado=true where s.usuario.id=:id")
    void revogarUsuario(@Param("id") Long id);
    List<SessaoToken> findByUsuarioIdAndRevogadoFalseAndExpiraEmAfterOrderByCriadoEmDesc(Long id, LocalDateTime agora);
    @Modifying @Query("delete from SessaoToken s where s.expiraEm < :agora")
    void limparExpirados(@Param("agora") LocalDateTime agora);
}
