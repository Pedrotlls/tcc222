package br.com.belval.bbs.controller;
import br.com.belval.bbs.model.Cupom;
import br.com.belval.bbs.service.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController
public class CupomController {
    private final CupomService service;
    public CupomController(CupomService service){this.service=service;}
    @GetMapping("/admin/cupons") public List<Cupom> listar(){return service.listar();}
    @PostMapping("/admin/cupons") @ResponseStatus(HttpStatus.CREATED) public Cupom criar(@RequestBody CupomService.Dados dados){return service.criar(dados);}
    public record Status(boolean ativo){}
    @PatchMapping("/admin/cupons/{codigo}") public Cupom status(@PathVariable String codigo,@RequestBody Status dados){return service.ativar(codigo,dados.ativo());}
    public record Cotacao(String codigo,List<CompraService.Linha> itens){}
    @PostMapping("/cupons/cotar") public Map<String,Object> cotar(@RequestBody Cotacao dados){return Map.of("codigo",CupomService.normalizar(dados.codigo()),"desconto",service.cotar(dados.codigo(),dados.itens()));}
}
