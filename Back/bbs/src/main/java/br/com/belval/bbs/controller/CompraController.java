package br.com.belval.bbs.controller;
import br.com.belval.bbs.model.*;
import br.com.belval.bbs.repository.*;
import br.com.belval.bbs.service.CompraService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController
public class CompraController {
    private final CompraService service;
    private final CompraRepository compras;
    private final UsuarioRepository usuarios;
    public CompraController(CompraService service,CompraRepository compras,UsuarioRepository usuarios) {
        this.service=service; this.compras=compras; this.usuarios=usuarios;
    }
    @GetMapping("/pedidos") public List<Compra> meus(Authentication a){return service.listar(a.getName());}
    @PostMapping("/pedidos") @ResponseStatus(HttpStatus.CREATED)
    public Compra criar(@RequestBody CompraService.Pedido p,Authentication a){return service.criar(a.getName(),p);}
    @PatchMapping("/pedidos/{id}/cancelar")
    public Compra cancelar(@PathVariable Long id,Authentication a){return service.status(id,"CANCELADO",a.getName(),false);}
    @GetMapping("/admin/pedidos") public List<Compra> todos(){return compras.findAllByOrderByIdDesc();}
    @GetMapping("/admin/clientes") public List<Usuario> clientes(){return usuarios.findAll();}
    public record Status(String status){}
    @PatchMapping("/admin/pedidos/{id}/status")
    public Compra status(@PathVariable Long id,@RequestBody Status s,Authentication a){return service.status(id,s.status(),a.getName(),true);}
}
