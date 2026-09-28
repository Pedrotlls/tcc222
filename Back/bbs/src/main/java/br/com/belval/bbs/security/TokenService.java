package br.com.belval.bbs.security;
import br.com.belval.bbs.model.*;
import br.com.belval.bbs.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
@Service
public class TokenService {
    private final SessaoTokenRepository repository;
    private final SecureRandom random=new SecureRandom();
    private final long acessoSegundos, renovacaoSegundos;
    public TokenService(SessaoTokenRepository repository,
        @Value("${app.auth.access-seconds:900}") long acessoSegundos,
        @Value("${app.auth.refresh-seconds:28800}") long renovacaoSegundos) {
        if(acessoSegundos<1 || renovacaoSegundos<acessoSegundos) throw new IllegalArgumentException("Validade dos tokens inválida.");
        this.repository=repository;this.acessoSegundos=acessoSegundos;this.renovacaoSegundos=renovacaoSegundos;
    }
    public record Emitido(String acesso,String renovacao,long acessoSegundos,long renovacaoSegundos) {}
    public record Sessao(Long id,LocalDateTime criadoEm,LocalDateTime expiraEm,boolean atual) {}
    private LocalDateTime agora(){return LocalDateTime.now(ZoneOffset.UTC);}
    private String aleatorio(){byte[] bytes=new byte[32];random.nextBytes(bytes);return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);}
    public static String hash(String valor){
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8)));}
        catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}
    }
    private boolean formato(String valor){return valor!=null && valor.matches("[A-Za-z0-9_-]{43}");}
    @Transactional public Emitido criar(Usuario usuario){
        repository.limparExpirados(agora());
        return emitir(usuario,UUID.randomUUID().toString(),agora().plusSeconds(renovacaoSegundos));
    }
    private Emitido emitir(Usuario usuario,String familia,LocalDateTime limite){
        String acesso=aleatorio(),renovacao=aleatorio();
        SessaoToken s=new SessaoToken();s.usuario=usuario;s.familia=familia;
        s.acessoHash=hash(acesso);s.renovacaoHash=hash(renovacao);s.credencialHash=hash(usuario.senhaHash);
        s.criadoEm=agora();s.expiraEm=limite;
        s.acessoExpiraEm=s.criadoEm.plusSeconds(acessoSegundos);
        if(s.acessoExpiraEm.isAfter(limite))s.acessoExpiraEm=limite;
        repository.save(s);
        return new Emitido(acesso,renovacao,Math.max(1,Duration.between(s.criadoEm,s.acessoExpiraEm).getSeconds()),Math.max(1,Duration.between(s.criadoEm,limite).getSeconds()));
    }
    @Transactional(readOnly=true) public Optional<Usuario> autenticar(String valor){
        if(!formato(valor))return Optional.empty();
        return repository.findByAcessoHash(hash(valor))
            .filter(s->!s.revogado && s.acessoExpiraEm.isAfter(agora()) && s.expiraEm.isAfter(agora()) && s.credencialHash.equals(hash(s.usuario.senhaHash)))
            .map(s->s.usuario);
    }
    @Transactional(noRollbackFor=ResponseStatusException.class) public Emitido renovar(String valor){
        if(!formato(valor))throw expirada();
        SessaoToken anterior=repository.bloquearRenovacao(hash(valor)).orElseThrow(this::expirada);
        if(anterior.revogado || !anterior.expiraEm.isAfter(agora()) || !anterior.credencialHash.equals(hash(anterior.usuario.senhaHash))){
            repository.revogarFamilia(anterior.familia);throw expirada();
        }
        anterior.revogado=true;repository.saveAndFlush(anterior);
        return emitir(anterior.usuario,anterior.familia,anterior.expiraEm);
    }
    @Transactional public void sair(String renovacao,String acesso){
        if(formato(renovacao))repository.bloquearRenovacao(hash(renovacao)).ifPresent(s->repository.revogarFamilia(s.familia));
        if(formato(acesso))repository.findByAcessoHash(hash(acesso)).ifPresent(s->repository.revogarFamilia(s.familia));
    }
    @Transactional public void revogarTodas(Long usuarioId){repository.revogarUsuario(usuarioId);}
    @Transactional(readOnly=true) public List<Sessao> listar(Long usuarioId,String acesso){
        String atual=acesso==null?"":hash(acesso);
        return repository.findByUsuarioIdAndRevogadoFalseAndExpiraEmAfterOrderByCriadoEmDesc(usuarioId,agora()).stream()
            .map(s->new Sessao(s.id,s.criadoEm,s.expiraEm,s.acessoHash.equals(atual))).toList();
    }
    @Transactional public void revogar(Long usuarioId,Long id){
        SessaoToken s=repository.findById(id).filter(v->v.usuario.id.equals(usuarioId))
            .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Sessão não encontrada."));
        repository.revogarFamilia(s.familia);
    }
    private ResponseStatusException expirada(){return new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sessão expirada. Entre novamente.");}
}
