package br.com.belval.bbs.controller;
import br.com.belval.bbs.service.RecuperacaoService;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
@RestController @RequestMapping("/auth/recuperacao")
public class RecuperacaoController {
    private final RecuperacaoService service;private final TaskExecutor executor;
    private final Map<String,Janela> limites=new HashMap<>();
    private record Janela(long inicio,int quantidade) {}
    public record Solicitar(String email) {}
    public record Redefinir(String token,String senha) {}
    public RecuperacaoController(RecuperacaoService service,@Qualifier("recoveryExecutor") TaskExecutor executor){this.service=service;this.executor=executor;}
    private synchronized void limitar(String chave,int max) {
        long now=System.currentTimeMillis();limites.entrySet().removeIf(e->now-e.getValue().inicio()>900000);
        Janela j=limites.get(chave);
        if((j!=null && j.quantidade()>=max) || (j==null && limites.size()>=5000))throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Muitas tentativas. Aguarde 15 minutos.");
        limites.put(chave,new Janela(j==null?now:j.inicio(),j==null?1:j.quantidade()+1));
    }
    @PostMapping @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String,String> solicitar(@RequestBody Solicitar dados,HttpServletRequest req,HttpServletResponse res) {
        res.setHeader("Cache-Control","no-store");service.conferirConfiguracao();limitar("enviar:"+req.getRemoteAddr(),10);
        if(dados.email()==null || dados.email().length()>150 || !dados.email().trim().matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Informe um e-mail válido.");
        String email=dados.email().trim().toLowerCase(Locale.ROOT);
        try {executor.execute(()->{try{service.solicitar(email);}catch(Exception e){org.slf4j.LoggerFactory.getLogger(getClass()).warn("Não foi possível enviar recuperação. Verifique a configuração SMTP.");}});}
        catch(org.springframework.core.task.TaskRejectedException e){throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Serviço ocupado. Tente novamente em alguns minutos.");}
        return Map.of("message","Se houver uma conta com esse e-mail, você receberá um link válido por 15 minutos. Confira também o spam.");
    }
    @PostMapping("/confirmar")
    public Map<String,String> confirmar(@RequestBody Redefinir dados,HttpServletRequest req,HttpServletResponse res) {
        res.setHeader("Cache-Control","no-store");limitar("confirmar:"+req.getRemoteAddr(),30);
        service.redefinir(dados.token(),dados.senha());
        return Map.of("message","Senha atualizada. Entre novamente em seus aparelhos.");
    }
}
