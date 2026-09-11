package br.com.belval.bbs.controller;
import br.com.belval.bbs.model.Usuario;
import br.com.belval.bbs.repository.UsuarioRepository;
import jakarta.servlet.http.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
@RestController @RequestMapping("/auth")
public class AuthController {
    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    public AuthController(UsuarioRepository usuarios, PasswordEncoder encoder) {
        this.usuarios = usuarios; this.encoder = encoder;
    }
    public record Credenciais(String nome, String email, String senha) {}
    @GetMapping("/session")
    public Map<String,Object> session(Authentication auth, CsrfToken csrf) {
        Map<String,Object> result = new HashMap<>();
        result.put("csrf", csrf.getToken());
        result.put("usuario", auth == null ? null : usuarios.findByEmail(auth.getName()).orElse(null));
        return result;
    }
    @PostMapping("/registro") @ResponseStatus(HttpStatus.CREATED)
    public Usuario registrar(@RequestBody Credenciais dados) {
        String email = email(dados.email());
        if (dados.nome() == null || dados.nome().trim().length() < 2 || dados.nome().length() > 100)
            throw erro("Informe seu nome (2 a 100 caracteres).");
        if (dados.senha() == null || dados.senha().length() < 8 || dados.senha().length() > 64 || dados.senha().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
            throw erro("A senha deve ter de 8 a 64 caracteres.");
        if (usuarios.findByEmail(email).isPresent()) throw erro("E-mail indisponivel para cadastro.");
        Usuario u = new Usuario(); u.nome = dados.nome().trim(); u.email = email;
        u.senhaHash = encoder.encode(dados.senha());
        return usuarios.save(u); // Perfil CLIENTE definido no servidor.
    }
    @PostMapping("/login")
    public Usuario login(@RequestBody Credenciais dados, HttpServletRequest req, HttpServletResponse res) {
        Usuario u = usuarios.findByEmail(email(dados.email())).orElse(null);
        if (u == null || dados.senha() == null || dados.senha().length() > 64 || dados.senha().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72 || !encoder.matches(dados.senha(), u.senhaHash))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha incorretos.");
        req.getSession(); req.changeSessionId();
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(u.email, null,
            List.of(new SimpleGrantedAuthority("ROLE_" + u.perfil))));
        SecurityContextHolder.setContext(context);
        new HttpSessionSecurityContextRepository().saveContext(context, req, res);
        return u;
    }
    @PostMapping("/logout")
    public Map<String,Boolean> logout(HttpServletRequest req) {
        if (req.getSession(false) != null) req.getSession(false).invalidate();
        SecurityContextHolder.clearContext();
        return Map.of("ok", true);
    }
    public record Perfil(String nome, String senhaAtual, String novaSenha) {}
    @PutMapping("/perfil")
    public Usuario perfil(@RequestBody Perfil dados, Authentication auth, HttpServletRequest req) {
        Usuario u = usuarios.findByEmail(auth.getName()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (dados.nome() == null || dados.nome().trim().length() < 2 || dados.nome().length() > 100)
            throw erro("Nome deve ter de 2 a 100 caracteres.");
        if (dados.novaSenha() != null && !dados.novaSenha().isEmpty()) {
            if (dados.senhaAtual() == null || dados.senhaAtual().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72 ||
                !encoder.matches(dados.senhaAtual(),u.senhaHash)) throw erro("Senha atual incorreta.");
            if (dados.novaSenha().length() < 8 || dados.novaSenha().length() > 64 ||
                dados.novaSenha().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
                throw erro("Nova senha deve ter de 8 a 64 caracteres (ate 72 bytes).");
            u.senhaHash=encoder.encode(dados.novaSenha());
            req.changeSessionId();
        }
        u.nome=dados.nome().trim();
        return usuarios.save(u);
    }
    private String email(String value) {
        if (value == null || value.length() > 150 || !value.trim().matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))
            throw erro("Informe um e-mail valido.");
        return value.trim().toLowerCase(Locale.ROOT);
    }
    private ResponseStatusException erro(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
