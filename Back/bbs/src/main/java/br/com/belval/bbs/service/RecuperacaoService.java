package br.com.belval.bbs.service;
import br.com.belval.bbs.model.*;
import br.com.belval.bbs.repository.UsuarioRepository;
import br.com.belval.bbs.security.TokenService;
import jakarta.persistence.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.*;
import java.util.Base64;
@Service
public class RecuperacaoService {
    @PersistenceContext private EntityManager em;
    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final TokenService tokens;
    private final ObjectProvider<JavaMailSender> mail;
    private final boolean enabled;
    private final String from, url;
    private final SecureRandom random=new SecureRandom();
    public RecuperacaoService(UsuarioRepository usuarios,PasswordEncoder encoder,TokenService tokens,ObjectProvider<JavaMailSender> mail,
        @Value("${app.recovery.enabled:false}") boolean enabled,@Value("${app.recovery.from:}") String from,@Value("${app.recovery.url:http://localhost:5173/}") String url) {
        this.usuarios=usuarios;this.encoder=encoder;this.tokens=tokens;this.mail=mail;this.enabled=enabled;this.from=from;this.url=url;
        if(enabled) {
            URI uri=URI.create(url);
            if(uri.getHost()==null || uri.getRawFragment()!=null || uri.getUserInfo()!=null || !("https".equals(uri.getScheme()) || ("http".equals(uri.getScheme()) && ("localhost".equals(uri.getHost()) || "127.0.0.1".equals(uri.getHost())))))
                throw new IllegalArgumentException("BBS_PUBLIC_URL deve usar HTTPS (HTTP apenas em localhost).");
        }
    }
    public void conferirConfiguracao() {
        if(!enabled || from.isBlank() || mail.getIfAvailable()==null)
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Recuperação por e-mail ainda não configurada. Procure a administração da loja.");
    }
    @Transactional public void solicitar(String email) {
        conferirConfiguracao();
        Usuario encontrado=usuarios.findByEmail(email).orElse(null);if(encontrado==null)return;
        Usuario usuario=em.find(Usuario.class,encontrado.id,LockModeType.PESSIMISTIC_WRITE);
        LocalDateTime now=LocalDateTime.now(ZoneOffset.UTC);
        RecuperacaoSenha r=em.find(RecuperacaoSenha.class,usuario.id);
        if(r!=null && r.criadoEm.isAfter(now.minusMinutes(1)))return;
        byte[] bytes=new byte[32];random.nextBytes(bytes);
        String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        boolean novo=r==null;if(novo){r=new RecuperacaoSenha();r.usuarioId=usuario.id;}
        r.tokenHash=TokenService.hash(token);r.credencialHash=TokenService.hash(usuario.senhaHash);
        r.criadoEm=now;r.expiraEm=now.plusMinutes(15);r.usado=false;
        if(novo)em.persist(r);em.flush();
        SimpleMailMessage mensagem=new SimpleMailMessage();mensagem.setFrom(from);mensagem.setTo(usuario.email);
        mensagem.setSubject("BBS — redefinição de senha");
        mensagem.setText("Você solicitou uma nova senha na Bits Bytes Store.\n\nAbra este link em até 15 minutos:\n"+url+"#redefinir="+token+"\n\nO link funciona uma única vez. Se não foi você, ignore esta mensagem. Sua senha permanece a mesma.");
        mail.getObject().send(mensagem);
    }
    @Transactional public void redefinir(String token,String senha) {
        if(token==null || !token.matches("[A-Za-z0-9_-]{43}"))throw invalido();
        if(senha==null || senha.length()<8 || senha.length()>64 || senha.getBytes(StandardCharsets.UTF_8).length>72)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"A senha deve ter de 8 a 64 caracteres (até 72 bytes).");
        var rows=em.createQuery("select r.usuarioId from RecuperacaoSenha r where r.tokenHash=:hash",Long.class).setParameter("hash",TokenService.hash(token)).getResultList();
        if(rows.isEmpty())throw invalido();
        Usuario usuario=em.find(Usuario.class,rows.get(0),LockModeType.PESSIMISTIC_WRITE);
        RecuperacaoSenha r=em.find(RecuperacaoSenha.class,usuario.id);
        if(r==null || r.usado || !r.tokenHash.equals(TokenService.hash(token)) || !r.expiraEm.isAfter(LocalDateTime.now(ZoneOffset.UTC)) || !r.credencialHash.equals(TokenService.hash(usuario.senhaHash)))throw invalido();
        usuario.senhaHash=encoder.encode(senha);r.usado=true;tokens.revogarTodas(usuario.id);
    }
    private ResponseStatusException invalido(){return new ResponseStatusException(HttpStatus.BAD_REQUEST,"Link inválido ou expirado. Solicite outro link.");}
}
