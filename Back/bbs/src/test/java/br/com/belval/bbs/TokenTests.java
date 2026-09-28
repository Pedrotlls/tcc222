package br.com.belval.bbs;
import br.com.belval.bbs.model.*;
import br.com.belval.bbs.repository.*;
import br.com.belval.bbs.security.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import java.time.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:tokens;DB_CLOSE_DELAY=-1","app.admin.password="})
@AutoConfigureMockMvc @ActiveProfiles("test")
class TokenTests {
    @Autowired MockMvc mvc;
    @Autowired UsuarioRepository usuarios;
    @Autowired SessaoTokenRepository sessoes;
    @Autowired PasswordEncoder encoder;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired TokenService tokens;
    @BeforeEach void setup(){
        sessoes.deleteAll();usuarios.deleteAll();
        for(String email:new String[]{"cliente@teste.local","outro@teste.local","admin@teste.local"}){
            Usuario u=new Usuario();u.nome="Teste";u.email=email;u.senhaHash=encoder.encode("ClienteTeste123");
            if(email.startsWith("admin"))u.perfil="ADMIN";usuarios.save(u);
        }
    }
    Cookie[] login(String email) throws Exception {
        return mvc.perform(post("/auth/login").with(csrf()).contentType("application/json")
            .content(json.writeValueAsString(java.util.Map.of("email",email,"senha","ClienteTeste123"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.senhaHash").doesNotExist()).andReturn().getResponse().getCookies();
    }
    String value(Cookie[] cookies,String nome){return java.util.Arrays.stream(cookies).filter(c->c.getName().equals(nome)).findFirst().orElseThrow().getValue();}
    @Test void tokensProtegidosHashNoBancoEPermissoes() throws Exception {
        Cookie[] c=login("cliente@teste.local");
        for(Cookie cookie:c){assertThat(cookie.isHttpOnly()).isTrue();assertThat(cookie.getAttribute("SameSite")).isEqualTo("Strict");}
        var s=sessoes.findAll().get(0);
        assertThat(s.acessoHash).isNotEqualTo(value(c,TokenCookies.ACESSO)).hasSize(64);
        assertThat(s.renovacaoHash).isNotEqualTo(value(c,TokenCookies.RENOVACAO)).hasSize(64);
        mvc.perform(get("/auth/session").cookie(c)).andExpect(jsonPath("$.usuario.email").value("cliente@teste.local"));
        mvc.perform(get("/admin/clientes").cookie(c)).andExpect(status().isForbidden());
        mvc.perform(get("/admin/clientes").cookie(login("admin@teste.local"))).andExpect(status().isOk());
        mvc.perform(get("/pedidos").cookie(new Cookie(TokenCookies.ACESSO,"x".repeat(43)))).andExpect(status().isUnauthorized());
    }
    @Test void expiracaoRotacaoEReusoRevogamFamilia() throws Exception {
        Cookie[] c=login("cliente@teste.local");
        jdbc.update("update bbs_sessao_token set acesso_expira_em=?",LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1));
        mvc.perform(get("/pedidos").cookie(c)).andExpect(status().isUnauthorized());
        var res=mvc.perform(post("/auth/refresh").cookie(c).with(csrf())).andExpect(status().isOk()).andReturn();
        Cookie[] novo=res.getResponse().getCookies();
        assertThat(value(novo,TokenCookies.RENOVACAO)).isNotEqualTo(value(c,TokenCookies.RENOVACAO));
        mvc.perform(get("/pedidos").cookie(novo)).andExpect(status().isOk());
        mvc.perform(post("/auth/refresh").cookie(c).with(csrf())).andExpect(status().isUnauthorized());
        mvc.perform(get("/pedidos").cookie(novo)).andExpect(status().isUnauthorized());
    }
    @Test void limiteAbsolutoNaoRenovaELogoutRevogaMesmoTokenExpirado() throws Exception {
        Cookie[] c=login("cliente@teste.local");
        jdbc.update("update bbs_sessao_token set expira_em=?",LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1));
        mvc.perform(post("/auth/refresh").cookie(c).with(csrf())).andExpect(status().isUnauthorized());
        Cookie[] outro=login("cliente@teste.local");
        mvc.perform(post("/auth/logout").cookie(outro).with(csrf())).andExpect(status().isOk());
        mvc.perform(get("/pedidos").cookie(outro)).andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/refresh").cookie(outro).with(csrf())).andExpect(status().isUnauthorized());
    }
    @Test void csrfObrigatorioNoLoginRefreshLogoutEPerfil() throws Exception {
        mvc.perform(post("/auth/login").contentType("application/json").content("{}")).andExpect(status().isForbidden());
        Cookie[] c=login("cliente@teste.local");
        mvc.perform(post("/auth/refresh").cookie(c)).andExpect(status().isForbidden());
        mvc.perform(post("/auth/logout").cookie(c)).andExpect(status().isForbidden());
        mvc.perform(put("/auth/perfil").cookie(c).contentType("application/json").content("{}")).andExpect(status().isForbidden());
    }
    @Test void trocaDeSenhaRevogaOutrosAcessosEMantemAtual() throws Exception {
        Cookie[] atual=login("cliente@teste.local"),outro=login("cliente@teste.local");
        var response=mvc.perform(put("/auth/perfil").cookie(atual).with(csrf()).contentType("application/json")
            .content("{\"nome\":\"Nome atualizado\",\"senhaAtual\":\"ClienteTeste123\",\"novaSenha\":\"NovaSenhaTeste456\"}"))
            .andExpect(status().isOk()).andReturn();
        mvc.perform(get("/pedidos").cookie(atual)).andExpect(status().isUnauthorized());
        mvc.perform(get("/pedidos").cookie(outro)).andExpect(status().isUnauthorized());
        mvc.perform(get("/pedidos").cookie(response.getResponse().getCookies())).andExpect(status().isOk());
        mvc.perform(post("/auth/refresh").cookie(outro).with(csrf())).andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/login").with(csrf()).contentType("application/json").content("{\"email\":\"cliente@teste.local\",\"senha\":\"ClienteTeste123\"}"))
            .andExpect(status().isUnauthorized());
    }
    @Test void somenteDonoPodeListarERevogarAcessos() throws Exception {
        Cookie[] dono=login("cliente@teste.local"),outro=login("outro@teste.local");
        var result=mvc.perform(get("/auth/sessoes").cookie(dono)).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].atual").value(true))
            .andExpect(jsonPath("$[0].acessoHash").doesNotExist()).andReturn();
        long id=json.readTree(result.getResponse().getContentAsString()).get(0).get("id").asLong();
        mvc.perform(delete("/auth/sessoes/"+id).cookie(outro).with(csrf())).andExpect(status().isNotFound());
        mvc.perform(delete("/auth/sessoes/"+id).cookie(dono).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get("/pedidos").cookie(dono)).andExpect(status().isUnauthorized());
        mvc.perform(get("/pedidos").cookie(outro)).andExpect(status().isOk());
    }
    @Test void sairDeTodosRevogaAccessERefreshDeTodosOsDispositivos() throws Exception {
        Cookie[] a=login("cliente@teste.local"),b=login("cliente@teste.local");
        mvc.perform(post("/auth/logout-todos").cookie(a).with(csrf())).andExpect(status().isOk());
        for(Cookie[] c:new Cookie[][]{a,b}){
            mvc.perform(get("/pedidos").cookie(c)).andExpect(status().isUnauthorized());
            mvc.perform(post("/auth/refresh").cookie(c).with(csrf())).andExpect(status().isUnauthorized());
        }
    }
    @Test void credencialAlteradaDiretoNoBancoInvalidaTokens() throws Exception {
        Cookie[] c=login("cliente@teste.local");
        Usuario u=usuarios.findByEmail("cliente@teste.local").orElseThrow();u.senhaHash=encoder.encode("OutraSenha456");usuarios.save(u);
        mvc.perform(get("/pedidos").cookie(c)).andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/refresh").cookie(c).with(csrf())).andExpect(status().isUnauthorized());
    }
}
