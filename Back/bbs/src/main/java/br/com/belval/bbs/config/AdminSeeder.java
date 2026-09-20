package br.com.belval.bbs.config;
import br.com.belval.bbs.model.Usuario;
import br.com.belval.bbs.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.util.Locale;
/** Administrador inicial criado apenas quando a senha e configurada no ambiente. */
@Component
public class AdminSeeder implements ApplicationRunner {
    private final UsuarioRepository repository;
    private final PasswordEncoder encoder;
    @Value("${app.admin.email}") private String email;
    @Value("${app.admin.password}") private String password;
    public AdminSeeder(UsuarioRepository repository, PasswordEncoder encoder) {
        this.repository = repository; this.encoder = encoder;
    }
    public void run(ApplicationArguments args) {
        if (password.isBlank()) return;
        if (password.length() < 12 || password.length() > 64 || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
            throw new IllegalStateException("BBS_ADMIN_PASSWORD deve ter de 12 a 64 caracteres.");
        String login = email.trim().toLowerCase(Locale.ROOT);
        if (repository.findByEmail(login).isPresent()) return;
        Usuario u = new Usuario(); u.email = login; u.nome = "Administrador BBS";
        u.perfil = "ADMIN"; u.senhaHash = encoder.encode(password); repository.save(u);
    }
}
