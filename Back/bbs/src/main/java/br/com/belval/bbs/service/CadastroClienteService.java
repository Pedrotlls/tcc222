package br.com.belval.bbs.service;

import br.com.belval.bbs.model.Usuario;
import br.com.belval.bbs.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.dao.DataIntegrityViolationException;
import java.util.Locale;
import java.nio.charset.StandardCharsets;

@Service
public class CadastroClienteService {
    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    public CadastroClienteService(UsuarioRepository usuarios, PasswordEncoder encoder) {
        this.usuarios = usuarios; this.encoder = encoder;
    }
    public Usuario criar(String nome, String email, String senha) {
        if (nome == null || nome.trim().length() < 2 || nome.length() > 100)
            throw erro("Informe um nome de 2 a 100 caracteres.");
        if (email == null || email.length() > 150 || !email.trim().matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))
            throw erro("Informe um e-mail válido.");
        if (senha == null || senha.length() < 8 || senha.length() > 64 || senha.getBytes(StandardCharsets.UTF_8).length > 72)
            throw erro("A senha deve ter de 8 a 64 caracteres (até 72 bytes).");
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (usuarios.findByEmail(normalized).isPresent()) throw erro("E-mail indisponível para cadastro.");
        Usuario u = new Usuario(); u.nome = nome.trim(); u.email = normalized;
        u.perfil = "CLIENTE"; u.senhaHash = encoder.encode(senha);
        try { return usuarios.saveAndFlush(u); }
        catch (DataIntegrityViolationException e) { throw erro("Não foi possível cadastrar. Confira os dados e se o e-mail já está em uso."); }
    }
    private ResponseStatusException erro(String mensagem) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,mensagem); }
}
