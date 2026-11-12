package br.com.belval.bbs.service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
public final class Cpf {
    private Cpf(){}
    public static String validar(String entrada){
        if(entrada==null || entrada.isBlank())return null;
        String cpf=entrada.replaceAll("[. -]","");
        boolean valido=cpf.matches("[0-9]{11}") && !cpf.matches("([0-9])\\1{10}");
        if(valido)for(int tamanho=9;tamanho<=10;tamanho++){
            int soma=0;for(int i=0;i<tamanho;i++)soma+=(cpf.charAt(i)-'0')*(tamanho+1-i);
            int digito=11-soma%11;if(digito>9)digito=0;
            if(cpf.charAt(tamanho)-'0'!=digito)valido=false;
        }
        if(!valido)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"CPF inválido. Confira os dígitos.");
        return cpf;
    }
}
