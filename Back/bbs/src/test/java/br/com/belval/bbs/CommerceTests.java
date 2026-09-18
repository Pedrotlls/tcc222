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
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired ProdutoRepository produtos;
    @Autowired UsuarioRepository usuarios;
    @Autowired CompraRepository compras;
    Integer produtoId;
    @BeforeEach void dados() {
        jdbc.update("DELETE FROM bbs_endereco");compras.deleteAll();usuarios.deleteAll();produtos.deleteAll();
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
    @Test void cadastroPeloAdminProtegePermissoesESessao() throws Exception {
        String body="{\"nome\":\"Cliente criado pelo admin\",\"email\":\"NOVOADMIN@teste.local\",\"senha\":\"InicialSegura123\",\"perfil\":\"ADMIN\"}";
        mvc.perform(post("/admin/clientes").with(csrf()).contentType("application/json").content(body)).andExpect(status().isUnauthorized());
        mvc.perform(post("/admin/clientes").with(user("cliente@teste.local").roles("CLIENTE")).with(csrf()).contentType("application/json").content(body)).andExpect(status().isForbidden());
        mvc.perform(post("/admin/clientes").with(user("admin@teste.local").roles("ADMIN")).contentType("application/json").content(body)).andExpect(status().isForbidden());
        Usuario admin=new Usuario();admin.nome="Admin";admin.email="admin@teste.local";admin.perfil="ADMIN";admin.senhaHash="teste";usuarios.save(admin);
        MockHttpSession session=new MockHttpSession();
        mvc.perform(post("/admin/clientes").session(session).with(user(admin.email).roles("ADMIN")).with(csrf()).contentType("application/json").content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.perfil").value("CLIENTE"))
            .andExpect(jsonPath("$.email").value("novoadmin@teste.local")).andExpect(jsonPath("$.senhaHash").doesNotExist());
        mvc.perform(get("/auth/session").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.usuario.email").value(admin.email));
        Usuario cliente=usuarios.findByEmail("novoadmin@teste.local").orElseThrow();
        assertThat(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().matches("InicialSegura123",cliente.senhaHash)).isTrue();
        mvc.perform(post("/admin/clientes").with(user(admin.email).roles("ADMIN")).with(csrf()).contentType("application/json").content(body)).andExpect(status().isBadRequest());
        mvc.perform(post("/admin/clientes").with(user(admin.email).roles("ADMIN")).with(csrf()).contentType("application/json").content("{\"nome\":\"X\",\"email\":\"invalido\",\"senha\":\"123\"}")).andExpect(status().isBadRequest());
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
    @Test void favoritosSaoPrivadosPersistidosEIdempotentes() throws Exception {
        mvc.perform(get("/favoritos")).andExpect(status().isUnauthorized());
        mvc.perform(put("/favoritos/"+produtoId).with(user("cliente@teste.local"))).andExpect(status().isForbidden());
        for(int i=0;i<2;i++) mvc.perform(put("/favoritos/"+produtoId).with(user("cliente@teste.local")).with(csrf()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        assertThat(usuarios.findByEmail("cliente@teste.local").orElseThrow().favoritos).containsExactly(produtoId);
        Usuario outro=new Usuario();outro.nome="Outro";outro.email="segundo@teste.local";outro.senhaHash="hash";usuarios.save(outro);
        mvc.perform(get("/favoritos").with(user(outro.email))).andExpect(content().json("[]"));
        mvc.perform(delete("/favoritos/"+produtoId).with(user(outro.email)).with(csrf())).andExpect(status().isOk());
        mvc.perform(get("/favoritos").with(user("cliente@teste.local"))).andExpect(jsonPath("$.length()").value(1));
        for(int i=0;i<2;i++) mvc.perform(delete("/favoritos/"+produtoId).with(user("cliente@teste.local")).with(csrf())).andExpect(content().json("[]"));
        mvc.perform(put("/favoritos/2147483647").with(user("cliente@teste.local")).with(csrf())).andExpect(status().isNotFound());
    }
    @Test void exclusaoRemoveFavoritosSemExcluirUsuario() throws Exception {
        mvc.perform(put("/favoritos/"+produtoId).with(user("cliente@teste.local")).with(csrf())).andExpect(status().isOk());
        mvc.perform(delete("/produtos/"+produtoId).with(user("admin@teste.local").roles("ADMIN")).with(csrf())).andExpect(status().isOk());
        mvc.perform(get("/favoritos").with(user("cliente@teste.local"))).andExpect(content().json("[]"));
        assertThat(usuarios.findByEmail("cliente@teste.local")).isPresent();
    }
    @Test void historicoPersisteTransicoesSemDuplicarRetries() throws Exception {
        var result=mvc.perform(post("/pedidos").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(pedido(1,"pedido-historico")))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.historico[0].status").value("RECEBIDO")).andReturn();
        long id=json.readTree(result.getResponse().getContentAsString()).get("id").asLong();
        for(String estado:List.of("SEPARANDO","SEPARANDO","ENVIADO","ENTREGUE"))
            mvc.perform(patch("/admin/pedidos/"+id+"/status").with(user("admin@teste.local").roles("ADMIN")).with(csrf())
                .contentType("application/json").content("{\"status\":\""+estado+"\"}")).andExpect(status().isOk());
        mvc.perform(get("/pedidos").with(user("cliente@teste.local"))).andExpect(status().isOk())
            .andExpect(jsonPath("$[0].historico.length()").value(4)).andExpect(jsonPath("$[0].historico[3].status").value("ENTREGUE"))
            .andExpect(jsonPath("$[0].historico[3].origem").value("ADMIN")).andExpect(jsonPath("$[0].historico[3].ocorridoEm").exists())
            .andExpect(jsonPath("$[0].itens.length()").value(1));
        mvc.perform(patch("/admin/pedidos/"+id+"/status").with(user("admin@teste.local").roles("ADMIN")).with(csrf()).contentType("application/json").content("{\"status\":\"RECEBIDO\"}"))
            .andExpect(status().isBadRequest());
        assertThat(compras.findById(id).orElseThrow().historico).hasSize(4);
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
    String endereco(String apelido, boolean principal) throws Exception {
        return json.writeValueAsString(Map.of("apelido",apelido,"principal",principal,"cep","06400-000","rua","Rua de teste","numero","10","bairro","Centro","cidade","Barueri","uf","sp"));
    }
    @Test void enderecosPrivadosPrincipalEHistoricoDaCompra() throws Exception {
        mvc.perform(get("/enderecos")).andExpect(status().isUnauthorized());
        mvc.perform(post("/enderecos").with(user("cliente@teste.local")).contentType("application/json").content(endereco("Casa",false))).andExpect(status().isForbidden());
        var casa=mvc.perform(post("/enderecos").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(endereco("Casa",false)))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.principal").value(true)).andExpect(jsonPath("$.usuarioId").doesNotExist()).andExpect(jsonPath("$.uf").value("SP")).andReturn();
        long casaId=json.readTree(casa.getResponse().getContentAsString()).get("id").asLong();
        var trabalho=mvc.perform(post("/enderecos").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(endereco("Trabalho",true)))
            .andExpect(status().isCreated()).andReturn();
        long trabalhoId=json.readTree(trabalho.getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(get("/enderecos").with(user("cliente@teste.local")))
            .andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].id").value(trabalhoId)).andExpect(jsonPath("$[1].principal").value(false));
        Usuario outro=new Usuario();outro.nome="Outro";outro.email="endereco@teste.local";outro.senhaHash="hash";usuarios.save(outro);
        mvc.perform(get("/enderecos").with(user(outro.email))).andExpect(content().json("[]"));
        mvc.perform(put("/enderecos/"+casaId).with(user(outro.email)).with(csrf()).contentType("application/json").content(endereco("Invasao",true))).andExpect(status().isNotFound());
        mvc.perform(delete("/enderecos/"+casaId).with(user(outro.email)).with(csrf())).andExpect(status().isNotFound());
        var payload=(com.fasterxml.jackson.databind.node.ObjectNode)json.readTree(pedido(1,"pedido-endereco"));
        payload.put("enderecoId",casaId);payload.remove("endereco");
        mvc.perform(post("/pedidos").with(user(outro.email)).with(csrf()).contentType("application/json").content(json.writeValueAsString(payload))).andExpect(status().isNotFound());
        mvc.perform(post("/pedidos").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(json.writeValueAsString(payload))).andExpect(status().isCreated());
        mvc.perform(delete("/enderecos/"+trabalhoId).with(user("cliente@teste.local")).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get("/enderecos").with(user("cliente@teste.local"))).andExpect(jsonPath("$[0].principal").value(true));
        mvc.perform(delete("/enderecos/"+casaId).with(user("cliente@teste.local")).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get("/pedidos").with(user("cliente@teste.local"))).andExpect(jsonPath("$[0].endereco").value(org.hamcrest.Matchers.containsString("Rua de teste")));
        // Retry da compra deve funcionar mesmo após excluir o endereço salvo.
        mvc.perform(post("/pedidos").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(json.writeValueAsString(payload))).andExpect(status().isCreated());
        assertThat(compras.count()).isEqualTo(1);
    }
    @Test void enderecoInvalidoNaoPersisteELimiteEhPorCliente() throws Exception {
        mvc.perform(post("/enderecos").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(endereco("Casa",false).replace("06400-000","123"))).andExpect(status().isBadRequest());
        for(int i=0;i<10;i++) mvc.perform(post("/enderecos").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(endereco("Casa "+i,false))).andExpect(status().isCreated());
        mvc.perform(post("/enderecos").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(endereco("Extra",false))).andExpect(status().isBadRequest());
        mvc.perform(get("/enderecos").with(user("cliente@teste.local"))).andExpect(jsonPath("$.length()").value(10));
    }

}
