package br.com.belval.bbs;
import br.com.belval.bbs.model.*;
import br.com.belval.bbs.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpSession;
import java.math.BigDecimal;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:commerce;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver","spring.jpa.hibernate.ddl-auto=create-drop","app.admin.password="})
@AutoConfigureMockMvc
@org.springframework.test.context.ActiveProfiles("test")
class CommerceTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired ProdutoRepository produtos;
    @Autowired UsuarioRepository usuarios;
    @Autowired CompraRepository compras;
    Integer produtoId;
    @BeforeEach void dados() {
        compras.deleteAll();usuarios.deleteAll();produtos.deleteAll();
        Usuario u=new Usuario();u.nome="Cliente teste";u.email="cliente@teste.local";u.senhaHash="hash-nao-utilizado";
        usuarios.save(u);
        Produto p=new Produto();p.setNome("SSD teste");p.setPreco(new BigDecimal("100.00"));p.setEstoque(2);p.setTipo("ssd");
        produtoId=produtos.save(p).getId();
    }
    String pedido(int qty,String chave) throws Exception {
        return json.writeValueAsString(Map.of("itens",List.of(Map.of("produtoId",produtoId,"quantidade",qty)),
            "chave",chave,"entrega","normal","pagamento","pix","total",0,
            "endereco",Map.of("cep","01001000","rua","Praca teste","numero","10","bairro","Centro","cidade","Sao Paulo","uf","SP")));
    }
    @Test void autorizacaoECsrf() throws Exception {
        mvc.perform(get("/produtos/ativos")).andExpect(status().isOk());
        mvc.perform(get("/admin/clientes")).andExpect(status().isUnauthorized());
        mvc.perform(get("/admin/clientes").with(user("cliente@teste.local").roles("CLIENTE"))).andExpect(status().isForbidden());
        mvc.perform(post("/pedidos").with(user("cliente@teste.local")).contentType("application/json").content(pedido(1,"teste-csrf")))
            .andExpect(status().isForbidden());
    }
    @Test void pedidoIdempotenteComPrecoDoServidorECancelamento() throws Exception {
        var result=mvc.perform(post("/pedidos").with(user("cliente@teste.local")).with(csrf())
            .contentType("application/json").content(pedido(1,"pedido-0001")))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.frete").value(14.90))
            .andExpect(jsonPath("$.total").value(104.90))
            .andExpect(jsonPath("$.status").value("RECEBIDO")).andReturn();
        long id=json.readTree(result.getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(post("/pedidos").with(user("cliente@teste.local")).with(csrf())
            .contentType("application/json").content(pedido(1,"pedido-0001"))).andExpect(jsonPath("$.id").value(id));
        assertThat(compras.count()).isEqualTo(1);
        assertThat(produtos.findById(produtoId).orElseThrow().getEstoque()).isEqualTo(1);
        mvc.perform(patch("/pedidos/"+id+"/cancelar").with(user("cliente@teste.local")).with(csrf())).andExpect(status().isOk());
        mvc.perform(patch("/pedidos/"+id+"/cancelar").with(user("cliente@teste.local")).with(csrf())).andExpect(status().isOk());
        assertThat(produtos.findById(produtoId).orElseThrow().getEstoque()).isEqualTo(2);
    }
    @Test void rejeitaEstoqueEQuantidadeSemAlterarBanco() throws Exception {
        for(int qty:List.of(0,-1,3)) mvc.perform(post("/pedidos").with(user("cliente@teste.local")).with(csrf())
            .contentType("application/json").content(pedido(qty,"pedido-invalido"))).andExpect(status().isBadRequest());
        assertThat(compras.count()).isZero();
        assertThat(produtos.findById(produtoId).orElseThrow().getEstoque()).isEqualTo(2);
    }
    @Test void clienteNaoVeNemCancelaPedidoDeOutro() throws Exception {
        var result=mvc.perform(post("/pedidos").with(user("cliente@teste.local")).with(csrf())
            .contentType("application/json").content(pedido(1,"pedido-privado"))).andReturn();
        long id=json.readTree(result.getResponse().getContentAsString()).get("id").asLong();
        Usuario outro=new Usuario();outro.nome="Outro";outro.email="outro@teste.local";outro.senhaHash="nao-utilizado";usuarios.save(outro);
        mvc.perform(get("/pedidos").with(user(outro.email))).andExpect(content().json("[]"));
        mvc.perform(patch("/pedidos/"+id+"/cancelar").with(user(outro.email)).with(csrf())).andExpect(status().isNotFound());
    }
    @Test void cadastroLoginESessaoSemExporSenha() throws Exception {
        String body="{\"nome\":\"Novo Cliente\",\"email\":\"novo@teste.local\",\"senha\":\"TesteSeguro123\",\"perfil\":\"ADMIN\"}";
        mvc.perform(post("/auth/registro").with(csrf()).contentType("application/json").content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.perfil").value("CLIENTE")).andExpect(jsonPath("$.senhaHash").doesNotExist());
        assertThat(usuarios.findByEmail("novo@teste.local").orElseThrow().senhaHash).startsWith("$2");
        var result=mvc.perform(post("/auth/login").with(csrf()).contentType("application/json").content(body))
            .andExpect(status().isOk()).andReturn();
        MockHttpSession sess=(MockHttpSession)result.getRequest().getSession(false);
        mvc.perform(get("/auth/session").session(sess)).andExpect(jsonPath("$.usuario.email").value("novo@teste.local"));
        mvc.perform(post("/auth/logout").session(sess).with(csrf())).andExpect(status().isOk());
    }
    @Test void administradorValidaProdutoEStatus() throws Exception {
        mvc.perform(post("/produtos").with(user("admin").roles("ADMIN")).with(csrf())
            .contentType("application/json").content("{\"nome\":\"Invalido\",\"preco\":-1,\"estoque\":-1}"))
            .andExpect(status().isBadRequest());
        var result=mvc.perform(post("/pedidos").with(user("cliente@teste.local")).with(csrf())
            .contentType("application/json").content(pedido(1,"pedido-status"))).andReturn();
        long id=json.readTree(result.getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(patch("/admin/pedidos/"+id+"/status").with(user("admin").roles("ADMIN")).with(csrf())
            .contentType("application/json").content("{\"status\":\"ENTREGUE\"}")).andExpect(status().isBadRequest());
        mvc.perform(patch("/admin/pedidos/"+id+"/status").with(user("admin").roles("ADMIN")).with(csrf())
            .contentType("application/json").content("{\"status\":\"SEPARANDO\"}")).andExpect(status().isOk());
    }
    @Test void cotacaoVariaPorRegiaoQuantidadeModalidadeEValor() throws Exception {
        String sp="{\"itens\":[{\"produtoId\":"+produtoId+",\"quantidade\":1}],\"uf\":\"SP\",\"entrega\":\"normal\"}";
        mvc.perform(post("/frete/cotacao").with(user("cliente@teste.local")).with(csrf())
            .contentType("application/json").content(sp))
            .andExpect(status().isOk()).andExpect(jsonPath("$.valor").value(14.90))
            .andExpect(jsonPath("$.regiao").value("Sao Paulo"));
        String norte="{\"itens\":[{\"produtoId\":"+produtoId+",\"quantidade\":2}],\"uf\":\"PA\",\"entrega\":\"expresso\"}";
        mvc.perform(post("/frete/cotacao").with(user("cliente@teste.local")).with(csrf())
            .contentType("application/json").content(norte))
            .andExpect(status().isOk()).andExpect(jsonPath("$.valor").value(79.26))
            .andExpect(jsonPath("$.prazoMin").value(4));
    }
}
