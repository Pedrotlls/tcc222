package br.com.belval.bbs.security;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;
/** Autenticação de cada requisição; HttpSession é usada somente para CSRF. */
public class TokenFilter extends OncePerRequestFilter {
    private final TokenService tokens;private final TokenCookies cookies;
    public TokenFilter(TokenService tokens,TokenCookies cookies){this.tokens=tokens;this.cookies=cookies;}
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
        tokens.autenticar(cookies.ler(req,TokenCookies.ACESSO)).ifPresent(u->{
            var context=SecurityContextHolder.createEmptyContext();
            context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(u.email,null,List.of(new SimpleGrantedAuthority("ROLE_"+u.perfil))));
            SecurityContextHolder.setContext(context);
        });
        chain.doFilter(req,res);
    }
}
