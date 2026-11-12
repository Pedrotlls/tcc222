package br.com.belval.bbs.controller;

import br.com.belval.bbs.model.Usuario;
import br.com.belval.bbs.service.CadastroClienteService;
import br.com.belval.bbs.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** /admin/** é protegido por ROLE_ADMIN e CSRF em SecurityConfig. */
@RestController
@RequestMapping("/admin/clientes")
public class AdminClienteController {
    private final CadastroClienteService cadastro;
    private final UsuarioRepository usuarios;
    public AdminClienteController(CadastroClienteService cadastro, UsuarioRepository usuarios) { this.cadastro = cadastro; this.usuarios=usuarios; }
    public record NovoCliente(String nome, String email, String senha, String cpf) {}
    @PostMapping("/admins") @ResponseStatus(HttpStatus.CREATED)
    public Usuario criarAdmin(@RequestBody NovoCliente dados) {
        Usuario admin=cadastro.criar(dados.nome(),dados.email(),dados.senha(),dados.cpf());
        admin.perfil="ADMIN";
        return usuarios.save(admin);
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Usuario criar(@RequestBody NovoCliente cliente) {
        // Não autentica o cliente nem substitui a sessão do administrador.
        return cadastro.criar(cliente.nome(),cliente.email(),cliente.senha(),cliente.cpf());
    }
}
