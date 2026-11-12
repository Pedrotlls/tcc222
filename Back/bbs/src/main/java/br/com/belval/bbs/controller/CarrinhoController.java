package br.com.belval.bbs.controller;
import br.com.belval.bbs.repository.UsuarioRepository;
import br.com.belval.bbs.service.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.List;
@RestController @RequestMapping("/carrinho")
public class CarrinhoController {
    private final CarrinhoService service;private final UsuarioRepository usuarios;private final CarrinhoEventos eventos;
    public CarrinhoController(CarrinhoService service,UsuarioRepository usuarios,CarrinhoEventos eventos){this.service=service;this.usuarios=usuarios;this.eventos=eventos;}
    private Long id(Authentication a){return usuarios.findByEmail(a.getName()).orElseThrow().id;}
    @GetMapping public CarrinhoService.Carrinho listar(Authentication a){return service.listar(id(a));}
    public record Alteracao(Integer produtoId,Integer delta){}
    @PatchMapping public CarrinhoService.Carrinho alterar(Authentication a,@RequestBody Alteracao d){return service.alterar(id(a),d.produtoId(),d.delta());}
    @PostMapping("/importar") public CarrinhoService.Carrinho importar(Authentication a,@RequestBody List<CompraService.Linha> itens){return service.importar(id(a),itens);}
    @GetMapping(value="/eventos",produces="text/event-stream") public SseEmitter eventos(Authentication a){return eventos.conectar(id(a));}
}
