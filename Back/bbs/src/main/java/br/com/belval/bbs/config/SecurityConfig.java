package br.com.belval.bbs.config;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
/** Sessao HttpOnly e CSRF. O proxy mantem frontend e API na mesma origem. */
@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(a -> a
                .requestMatchers("/auth/session", "/auth/login", "/auth/registro", "/error").permitAll()
                .requestMatchers(HttpMethod.GET, "/produtos/ativos", "/imagens/**").permitAll()
                .requestMatchers("/produtos/**", "/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .formLogin(f -> f.disable()).httpBasic(b -> b.disable()).logout(l -> l.disable())
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req,res,ex) -> res.sendError(401))
                .accessDeniedHandler((req,res,ex) -> res.sendError(403)))
            .build();
    }
}
