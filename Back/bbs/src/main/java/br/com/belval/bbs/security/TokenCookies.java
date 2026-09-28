package br.com.belval.bbs.security;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
@Component
public class TokenCookies {
    public static final String ACESSO="bbs_access",RENOVACAO="bbs_refresh";
    private final boolean secure;
    public TokenCookies(@Value("${app.auth.cookie-secure:false}") boolean secure){this.secure=secure;}
    public String ler(HttpServletRequest req,String nome){
        if(req.getCookies()!=null)for(Cookie c:req.getCookies())if(nome.equals(c.getName()))return c.getValue();
        return null;
    }
    public void gravar(HttpServletResponse res,TokenService.Emitido tokens){
        cookie(res,ACESSO,tokens.acesso(),tokens.acessoSegundos());
        cookie(res,RENOVACAO,tokens.renovacao(),tokens.renovacaoSegundos());
        res.setHeader("Cache-Control","no-store");
    }
    public void limpar(HttpServletResponse res){cookie(res,ACESSO,"",0);cookie(res,RENOVACAO,"",0);}
    private void cookie(HttpServletResponse res,String nome,String valor,long segundos){
        res.addHeader("Set-Cookie",ResponseCookie.from(nome,valor).path("/").httpOnly(true).secure(secure).sameSite("Strict").maxAge(segundos).build().toString());
    }
}
