package br.com.belval.bbs.controller;

import br.com.belval.bbs.model.Usuario;
import br.com.belval.bbs.service.CadastroClienteService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** /admin/** é protegido por ROLE_ADMIN e CSRF em SecurityConfig. */
@RestController
@RequestMapping("/admin/clientes")
public class AdminClienteController {
    private final CadastroClienteService cadastro;
    public AdminClienteController(CadastroClienteService cadastro) { this.cadastro = cadastro; }
    public record NovoCliente(String nome, String email, String senha) {}
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Usuario criar(@RequestBody NovoCliente cliente) {
        // Não autentica o cliente nem substitui a sessão do administrador.
        return cadastro.criar(cliente.nome(),cliente.email(),cliente.senha());
    }
}
