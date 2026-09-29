package br.com.belval.bbs.controller;
import br.com.belval.bbs.model.EnderecoSalvo;
import br.com.belval.bbs.service.EnderecoService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/enderecos")
public class EnderecoController {
    private final EnderecoService service;
    public EnderecoController(EnderecoService service) {this.service=service;}
    @GetMapping public List<EnderecoSalvo> listar(Authentication auth) {return service.listar(auth.getName());}
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public EnderecoSalvo criar(Authentication auth,@RequestBody EnderecoService.Dados dados) {return service.salvar(auth.getName(),null,dados);}
    @PutMapping("/{id}") public EnderecoSalvo editar(Authentication auth,@PathVariable Long id,@RequestBody EnderecoService.Dados dados) {return service.salvar(auth.getName(),id,dados);}
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(Authentication auth,@PathVariable Long id) {service.excluir(auth.getName(),id);}
}
