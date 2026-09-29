package br.com.belval.bbs.config;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
/** Tokens HttpOnly e proteção CSRF, inclusive no login e na renovação. */
@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean SecurityFilterChain security(HttpSecurity http, br.com.belval.bbs.security.TokenService tokens, br.com.belval.bbs.security.TokenCookies cookies) throws Exception {
        return http.securityContext(c -> c.securityContextRepository(new org.springframework.security.web.context.NullSecurityContextRepository()))
            .requestCache(c -> c.disable())
            .addFilterBefore(new br.com.belval.bbs.security.TokenFilter(tokens,cookies),org.springframework.security.web.authentication.AnonymousAuthenticationFilter.class)
            .authorizeHttpRequests(a -> a
                .dispatcherTypeMatchers(jakarta.servlet.DispatcherType.ASYNC).permitAll()
                .requestMatchers("/auth/recuperacao", "/auth/recuperacao/confirmar", "/auth/session", "/auth/login", "/auth/registro", "/auth/refresh", "/auth/logout", "/error").permitAll()
                .requestMatchers(HttpMethod.GET, "/produtos/ativos", "/imagens/**", "/avaliacoes/*").permitAll()
                .requestMatchers("/produtos/**", "/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .formLogin(f -> f.disable()).httpBasic(b -> b.disable()).logout(l -> l.disable())
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req,res,ex) -> res.sendError(401))
                .accessDeniedHandler((req,res,ex) -> {
                    res.setStatus(403);res.setContentType("application/json");
                    res.getWriter().write(ex instanceof org.springframework.security.web.csrf.CsrfException
                        ? "{\"code\":\"CSRF_INVALID\",\"message\":\"Atualize a sessão e tente novamente.\"}"
                        : "{\"message\":\"Acesso negado.\"}");
                }))
            .build();
    }
}
