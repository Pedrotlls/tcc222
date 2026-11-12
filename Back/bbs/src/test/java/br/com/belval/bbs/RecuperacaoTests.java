package br.com.belval.bbs;
import br.com.belval.bbs.model.Usuario;
import br.com.belval.bbs.repository.*;
import br.com.belval.bbs.security.TokenService;
import br.com.belval.bbs.service.RecuperacaoService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.core.task.TaskExecutor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.mockito.ArgumentCaptor;
import java.time.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:recovery;DB_CLOSE_DELAY=-1","app.admin.password=","app.recovery.enabled=true","app.recovery.from=teste@bbs.local"})
@AutoConfigureMockMvc @ActiveProfiles("test")
class RecuperacaoTests {
    @Autowired RecuperacaoService service;
    @Autowired UsuarioRepository usuarios;
    @Autowired SessaoTokenRepository sessoes;
    @Autowired PasswordEncoder encoder;
    @Autowired TokenService tokens;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @MockBean JavaMailSender mail;
    @MockBean(name="recoveryExecutor") TaskExecutor executor;
    Usuario usuario;
    @BeforeEach void setup(){
        jdbc.update("delete from bbs_recuperacao_senha");sessoes.deleteAll();usuarios.deleteAll();
        usuario=new Usuario();usuario.nome="Cliente teste";usuario.email="cliente@teste.local";usuario.senhaHash=encoder.encode("SenhaAntiga123");usuario=usuarios.save(usuario);
        doAnswer(i->{((Runnable)i.getArgument(0)).run();return null;}).when(executor).execute(any());
    }
    String solicitar(){
        service.solicitar(usuario.email);var captor=ArgumentCaptor.forClass(SimpleMailMessage.class);verify(mail,atLeastOnce()).send(captor.capture());
        return captor.getValue().getText().split("#redefinir=")[1].split("\\s")[0];
    }
    @Test void tokenProtegidoUsoUnicoRevogaAcessos(){
        var sessao=tokens.criar(usuario);String token=solicitar();
        assertThat(token).hasSize(43);assertThat(jdbc.queryForObject("select token_hash from bbs_recuperacao_senha",String.class)).isEqualTo(TokenService.hash(token)).isNotEqualTo(token);
        service.redefinir(token,"NovaSenha12345");assertThat(tokens.autenticar(sessao.acesso())).isEmpty();
        assertThatThrownBy(()->tokens.renovar(sessao.renovacao()));
        assertThat(encoder.matches("NovaSenha12345",usuarios.findById(usuario.id).orElseThrow().senhaHash)).isTrue();
        assertThatThrownBy(()->service.redefinir(token,"OutraSenha12345")).hasMessageContaining("Link inválido");
    }
    @Test void expiradoNaoAlteraSenha(){String token=solicitar();jdbc.update("update bbs_recuperacao_senha set expira_em=?",LocalDateTime.now(ZoneOffset.UTC).minusSeconds(1));assertThatThrownBy(()->service.redefinir(token,"NovaSenha12345"));assertThat(encoder.matches("SenhaAntiga123",usuarios.findById(usuario.id).orElseThrow().senhaHash)).isTrue();}
    @Test void novoLinkInvalidaAnteriorERespeitaIntervalo(){String antigo=solicitar();service.solicitar(usuario.email);verify(mail,times(1)).send(any(SimpleMailMessage.class));jdbc.update("update bbs_recuperacao_senha set criado_em=?",LocalDateTime.now(ZoneOffset.UTC).minusMinutes(2));String novo=solicitar();assertThat(novo).isNotEqualTo(antigo);assertThatThrownBy(()->service.redefinir(antigo,"NovaSenha12345"));service.redefinir(novo,"NovaSenha12345");}
    @Test void senhaAlteradaInvalidaLinkAindaNaoUsado(){String token=solicitar();usuario.senhaHash=encoder.encode("TrocaDeSenha123");usuarios.save(usuario);assertThatThrownBy(()->service.redefinir(token,"NovaSenha12345"));}
    @Test void senhaCurtaOuTokenInvalidoNaoConsomeLink(){String token=solicitar();assertThatThrownBy(()->service.redefinir(token,"123"));assertThatThrownBy(()->service.redefinir("invalido","NovaSenha12345"));service.redefinir(token,"NovaSenha12345");}
    @Test void respostaGenericaSemVazarTokenEComCsrf() throws Exception {
        String known=mvc.perform(post("/auth/recuperacao").with(csrf()).contentType("application/json").content("{\"email\":\"cliente@teste.local\"}")).andExpect(status().isAccepted()).andExpect(jsonPath("$.token").doesNotExist()).andReturn().getResponse().getContentAsString();
        mvc.perform(post("/auth/recuperacao").with(csrf()).contentType("application/json").content("{\"email\":\"naoexiste@teste.local\"}")).andExpect(status().isAccepted()).andExpect(content().string(known));
        mvc.perform(post("/auth/recuperacao").contentType("application/json").content("{}")).andExpect(status().isForbidden());
        mvc.perform(post("/auth/recuperacao/confirmar").contentType("application/json").content("{}")).andExpect(status().isForbidden());
    }
    @Test void limitaTentativasSemDependerDaExistenciaDaConta() throws Exception {
        for(int i=0;i<10;i++)mvc.perform(post("/auth/recuperacao").with(r->{r.setRemoteAddr("192.0.2.45");return r;}).with(csrf()).contentType("application/json").content("{\"email\":\"naoexiste@teste.local\"}")).andExpect(status().isAccepted());
        mvc.perform(post("/auth/recuperacao").with(r->{r.setRemoteAddr("192.0.2.45");return r;}).with(csrf()).contentType("application/json").content("{\"email\":\"cliente@teste.local\"}")).andExpect(status().isTooManyRequests());verify(mail,never()).send(any(SimpleMailMessage.class));
    }
}
