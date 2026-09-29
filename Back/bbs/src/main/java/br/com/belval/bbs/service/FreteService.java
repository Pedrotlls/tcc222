package br.com.belval.bbs.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.math.*;
import java.util.*;

/**
 * Cotacao academica por regiao, quantidade e valor do carrinho.
 * Nao representa tarifa de transportadora.
 */
@Service
public class FreteService {
    private static final Set<String> SUDESTE=Set.of("SP","RJ","MG","ES");
    private static final Set<String> SUL=Set.of("PR","SC","RS");
    private static final Set<String> CENTRO_OESTE=Set.of("DF","GO","MT","MS");
    private static final Set<String> NORDESTE=Set.of("AL","BA","CE","MA","PB","PE","PI","RN","SE");
    private static final Set<String> NORTE=Set.of("AC","AP","AM","PA","RO","RR","TO");
    public record Cotacao(BigDecimal valor,int prazoMin,int prazoMax,String regiao,boolean gratis,String regra) {}

    public Cotacao calcular(BigDecimal subtotal,int quantidade,String uf,String modalidade) {
        if(subtotal==null || subtotal.signum()<0 || quantidade<1 || quantidade>9900)
            throw erro("Carrinho invalido para cotacao.");
        String estado=Objects.toString(uf,"").trim().toUpperCase(Locale.ROOT);
        String regiao;
        BigDecimal base;
        int prazo;
        if(estado.equals("SP")) {regiao="Sao Paulo";base=bd("14.90");prazo=2;}
        else if(SUDESTE.contains(estado)) {regiao="Sudeste";base=bd("19.90");prazo=3;}
        else if(SUL.contains(estado)) {regiao="Sul";base=bd("24.90");prazo=4;}
        else if(CENTRO_OESTE.contains(estado)) {regiao="Centro-Oeste";base=bd("28.90");prazo=5;}
        else if(NORDESTE.contains(estado)) {regiao="Nordeste";base=bd("34.90");prazo=7;}
        else if(NORTE.contains(estado)) {regiao="Norte";base=bd("42.90");prazo=9;}
        else throw erro("UF invalida para cotacao.");
        if(!Set.of("normal","expresso").contains(modalidade)) throw erro("Modalidade de entrega invalida.");
        boolean gratis=modalidade.equals("normal") && subtotal.compareTo(bd("3500.00"))>=0;
        BigDecimal volume=bd("1.50").multiply(BigDecimal.valueOf(Math.max(0,quantidade-1)));
        BigDecimal valor=gratis ? BigDecimal.ZERO : base.add(volume);
        int min=prazo,max=prazo+3;
        if(modalidade.equals("expresso")) {
            valor=valor.multiply(bd("1.65")).add(bd("6.00"));
            min=Math.max(1,prazo/2);max=Math.max(min+1,prazo);
        }
        return new Cotacao(valor.setScale(2,RoundingMode.HALF_UP),min,max,regiao,gratis,
            gratis ? "Frete normal gratis em compras a partir de R$ 3.500" :
            "Estimativa academica por regiao, quantidade e modalidade");
    }
    private BigDecimal bd(String n){return new BigDecimal(n);}
    private ResponseStatusException erro(String message){return new ResponseStatusException(HttpStatus.BAD_REQUEST,message);}
}
