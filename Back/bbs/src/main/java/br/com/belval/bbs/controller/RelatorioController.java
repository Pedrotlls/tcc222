package br.com.belval.bbs.controller;
import jakarta.persistence.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.math.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
@RestController @RequestMapping("/admin/relatorios")
public class RelatorioController {
    @PersistenceContext private EntityManager em;
    public record Dia(LocalDate data,long pedidos,BigDecimal valor) {}
    public record Produto(Integer id,String nome,long unidades,BigDecimal subtotal) {}
    public record Resumo(LocalDate inicio,LocalDate fim,long pedidos,long cancelados,BigDecimal valor,BigDecimal ticketMedio,List<Dia> dias,List<Produto> produtos,Map<String,Long> estados) {}
    @GetMapping @Transactional(readOnly=true)
    public Resumo consultar(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate inicio,@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fim) {
        if(fim.isBefore(inicio) || ChronoUnit.DAYS.between(inicio,fim)>365 || inicio.getYear()<2000 || fim.getYear()>2100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Escolha um intervalo de até 366 dias, entre 2000 e 2100.");
        LocalDateTime a=inicio.atStartOfDay(),b=fim.plusDays(1).atStartOfDay();
        String filtro=" where c.criadoEm>=:inicio and c.criadoEm<:fim";
        var estados=new LinkedHashMap<String,Long>();
        for(var row:em.createQuery("select c.status,count(c) from Compra c"+filtro+" group by c.status",Object[].class).setParameter("inicio",a).setParameter("fim",b).getResultList())estados.put((String)row[0],(Long)row[1]);
        String validos=filtro+" and c.status<>'CANCELADO'";
        List<Dia> dias=em.createQuery("select cast(c.criadoEm as LocalDate),count(c),sum(c.total) from Compra c"+validos+" group by cast(c.criadoEm as LocalDate) order by cast(c.criadoEm as LocalDate)",Object[].class).setParameter("inicio",a).setParameter("fim",b).getResultList().stream().map(r->new Dia((LocalDate)r[0],(Long)r[1],(BigDecimal)r[2])).toList();
        List<Produto> produtos=em.createQuery("select i.produtoId,max(i.nome),sum(i.quantidade),sum(i.preco*i.quantidade) from Compra c join c.itens i"+validos+" group by i.produtoId order by sum(i.quantidade) desc,i.produtoId",Object[].class).setParameter("inicio",a).setParameter("fim",b).setMaxResults(10).getResultList().stream().map(r->new Produto((Integer)r[0],(String)r[1],(Long)r[2],(BigDecimal)r[3])).toList();
        long pedidos=dias.stream().mapToLong(Dia::pedidos).sum();
        BigDecimal valor=dias.stream().map(Dia::valor).reduce(BigDecimal.ZERO,BigDecimal::add);
        return new Resumo(inicio,fim,pedidos,estados.getOrDefault("CANCELADO",0L),valor,pedidos==0?BigDecimal.ZERO:valor.divide(BigDecimal.valueOf(pedidos),2,RoundingMode.HALF_UP),dias,produtos,estados);
    }
}
