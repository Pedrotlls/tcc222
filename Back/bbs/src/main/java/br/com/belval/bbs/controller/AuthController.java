package br.com.belval.bbs.controller;
import br.com.belval.bbs.model.Usuario;
import br.com.belval.bbs.repository.UsuarioRepository;
import jakarta.servlet.http.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import br.com.belval.bbs.security.*;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
@RestController @RequestMapping("/auth")
public class AuthController {
    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final TokenService tokens;
    private final TokenCookies cookies;
    public AuthController(UsuarioRepository usuarios, PasswordEncoder encoder, TokenService tokens, TokenCookies cookies) {
        this.usuarios = usuarios; this.encoder = encoder;this.tokens=tokens;this.cookies=cookies;
    }
    public record Credenciais(String nome, String email, String senha) {}
    @GetMapping("/session")
    public Map<String,Object> session(Authentication auth, CsrfToken csrf, HttpServletRequest req, HttpServletResponse res) {
        Map<String,Object> result = new HashMap<>();
        res.setHeader("Cache-Control","no-store");
        result.put("csrf", csrf.getToken());
        result.put("renovavel",cookies.ler(req,TokenCookies.RENOVACAO)!=null);
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
        tokens.sair(cookies.ler(req,TokenCookies.RENOVACAO),cookies.ler(req,TokenCookies.ACESSO));
        req.getSession(); req.changeSessionId();
        cookies.gravar(res,tokens.criar(u));
        return u;
    }
    @PostMapping("/refresh")
    public Map<String,Boolean> refresh(HttpServletRequest req,HttpServletResponse res) {
        try {cookies.gravar(res,tokens.renovar(cookies.ler(req,TokenCookies.RENOVACAO)));}
        catch(ResponseStatusException e){cookies.limpar(res);throw e;}
        return Map.of("ok",true);
    }
    @PostMapping("/logout")
    public Map<String,Boolean> logout(HttpServletRequest req,HttpServletResponse res) {
        tokens.sair(cookies.ler(req,TokenCookies.RENOVACAO),cookies.ler(req,TokenCookies.ACESSO));
        cookies.limpar(res);
        if(req.getSession(false)!=null)req.getSession(false).invalidate();
        SecurityContextHolder.clearContext();
        return Map.of("ok",true);
    }
    @GetMapping("/sessoes")
    public List<TokenService.Sessao> sessoes(Authentication auth,HttpServletRequest req){
        return tokens.listar(conta(auth).id,cookies.ler(req,TokenCookies.ACESSO));
    }
    @DeleteMapping("/sessoes/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revogar(@PathVariable Long id,Authentication auth){tokens.revogar(conta(auth).id,id);}
    @PostMapping("/logout-todos")
    public Map<String,Boolean> sairDeTodos(Authentication auth,HttpServletRequest req,HttpServletResponse res){
        tokens.revogarTodas(conta(auth).id);return logout(req,res);
    }
    private Usuario conta(Authentication auth){
        return usuarios.findByEmail(auth.getName()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
    public record Perfil(String nome, String senhaAtual, String novaSenha) {}
    @PutMapping("/perfil")
    public Usuario perfil(@RequestBody Perfil dados, Authentication auth, HttpServletRequest req, HttpServletResponse res) {
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

        }
        u.nome=dados.nome().trim();
        usuarios.save(u);
        if(dados.novaSenha()!=null && !dados.novaSenha().isEmpty()){
            tokens.revogarTodas(u.id);
            cookies.gravar(res,tokens.criar(u));
        }
        return u;
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
