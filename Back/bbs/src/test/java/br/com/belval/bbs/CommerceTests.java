package br.com.belval.bbs;
import br.com.belval.bbs.model.*;
import br.com.belval.bbs.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
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
        jdbc.update("DELETE FROM bbs_avaliacao_voto");jdbc.update("DELETE FROM bbs_avaliacao");jdbc.update("DELETE FROM bbs_carrinho_item");jdbc.update("DELETE FROM bbs_cupom");jdbc.update("DELETE FROM bbs_sessao_token");jdbc.update("DELETE FROM bbs_endereco");compras.deleteAll();usuarios.deleteAll();produtos.deleteAll();
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
        Usuario admin=new Usuario();admin.nome="Admin";admin.email="admin@teste.local";admin.perfil="ADMIN";admin.senhaHash=new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("AdminTeste12345");usuarios.save(admin);
        var login=mvc.perform(post("/auth/login").with(csrf()).contentType("application/json")
            .content("{\"email\":\"admin@teste.local\",\"senha\":\"AdminTeste12345\"}")).andExpect(status().isOk()).andReturn();
        var cookies=login.getResponse().getCookies();
        mvc.perform(post("/admin/clientes").cookie(cookies).with(csrf()).contentType("application/json").content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.perfil").value("CLIENTE"))
            .andExpect(jsonPath("$.email").value("novoadmin@teste.local")).andExpect(jsonPath("$.senhaHash").doesNotExist());
        mvc.perform(get("/auth/session").cookie(cookies)).andExpect(status().isOk()).andExpect(jsonPath("$.usuario.email").value(admin.email));
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
        var cookies=result.getResponse().getCookies();
        mvc.perform(get("/auth/session").cookie(cookies)).andExpect(jsonPath("$.usuario.email").value("novo@teste.local"));
        mvc.perform(post("/auth/logout").cookie(cookies).with(csrf())).andExpect(status().isOk());
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


    String cupom(String codigo,int limite) throws Exception {
        return json.writeValueAsString(Map.of("codigo",codigo,"percentual",20,"limiteUsos",limite,"validade",java.time.LocalDateTime.now(java.time.ZoneOffset.UTC).plusDays(1).toString()));
    }
    String pedidoCupom(String chave,String codigo) throws Exception {
        var node=(com.fasterxml.jackson.databind.node.ObjectNode)json.readTree(pedido(1,chave));node.put("cupom",codigo);return node.toString();
    }
    @Test void cupomValidaPermissaoValidadeLimiteEIdempotencia() throws Exception {
        mvc.perform(post("/admin/cupons").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(cupom("BBS20",1))).andExpect(status().isForbidden());
        mvc.perform(post("/admin/cupons").with(user("admin").roles("ADMIN")).with(csrf()).contentType("application/json").content(cupom("BBS20",1))).andExpect(status().isCreated());
        String body=pedidoCupom("pedido-cupom-1","bbs20");
        mvc.perform(post("/pedidos").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.total").value(94.90)).andExpect(jsonPath("$.desconto").value(20)).andExpect(jsonPath("$.acompanhamento").isString());
        mvc.perform(post("/pedidos").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(body)).andExpect(status().isCreated());
        assertThat(jdbc.queryForObject("select usos from bbs_cupom where codigo='BBS20'",Integer.class)).isEqualTo(1);
        mvc.perform(post("/pedidos").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(pedidoCupom("pedido-cupom-2","BBS20"))).andExpect(status().isBadRequest());
        assertThat(produtos.findById(produtoId).orElseThrow().getEstoque()).isEqualTo(1);
        assertThat(compras.count()).isEqualTo(1);
        jdbc.update("update bbs_cupom set validade=?",java.time.LocalDateTime.now(java.time.ZoneOffset.UTC).minusDays(1));
        mvc.perform(post("/cupons/cotar").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(json.writeValueAsString(Map.of("codigo","BBS20","itens",List.of(Map.of("produtoId",produtoId,"quantidade",1)))))).andExpect(status().isBadRequest());
    }
    @Test void carrinhoCompartilhaContaIsolaUsuariosELimpaNaCompra() throws Exception {
        String linha=json.writeValueAsString(Map.of("produtoId",produtoId,"delta",1));
        mvc.perform(patch("/carrinho").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(linha)).andExpect(status().isOk()).andExpect(jsonPath("$.versao").value(1));
        mvc.perform(get("/carrinho").with(user("cliente@teste.local"))).andExpect(jsonPath("$.itens['"+produtoId+"'].qty").value(1)).andExpect(jsonPath("$.itens['"+produtoId+"'].price").value(100));
        mvc.perform(patch("/carrinho").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(linha)).andExpect(status().isOk());
        mvc.perform(patch("/carrinho").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(linha)).andExpect(status().isBadRequest());
        Usuario outro=new Usuario();outro.nome="Outro";outro.email="outro@teste.local";outro.senhaHash="hash";usuarios.save(outro);
        mvc.perform(get("/carrinho").with(user(outro.email))).andExpect(jsonPath("$.itens").isEmpty());
        mvc.perform(post("/pedidos").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(pedido(2,"pedido-cart-1"))).andExpect(status().isCreated());
        mvc.perform(get("/carrinho").with(user("cliente@teste.local"))).andExpect(jsonPath("$.itens").isEmpty());
    }
    @Test void importarCarrinhoNaoDuplicaEIgnoraPrecosDoNavegador() throws Exception {
        String body="[{\"produtoId\":"+produtoId+",\"quantidade\":2,\"preco\":0}]";
        for(int i=0;i<2;i++)mvc.perform(post("/carrinho/importar").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(body))
            .andExpect(status().isOk()).andExpect(jsonPath("$.itens['"+produtoId+"'].qty").value(2)).andExpect(jsonPath("$.itens['"+produtoId+"'].price").value(100));
    }
    @Test void avaliacaoExigeCompraEEUmaPorClienteProduto() throws Exception {
        String body="{\"nota\":5,\"comentario\":\"Muito bom\"}";
        mvc.perform(put("/avaliacoes/"+produtoId).with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(body)).andExpect(status().isForbidden());
        mvc.perform(post("/pedidos").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(pedido(1,"pedido-review-1"))).andExpect(status().isCreated());
        for(int i=0;i<2;i++)mvc.perform(put("/avaliacoes/"+produtoId).with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(body)).andExpect(status().isOk());
        mvc.perform(get("/avaliacoes/"+produtoId)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].nota").value(5)).andExpect(jsonPath("$[0].usuarioId").doesNotExist());
        mvc.perform(put("/avaliacoes/"+produtoId).with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(body.replace(":5",":6"))).andExpect(status().isBadRequest());
    }
    // ---------- Feedback dos produtos: votos, resumo, exclusão e moderação ----------
    static final String OUTRO="outro@teste.local";
    /** Cliente compra e avalia o produto de teste; devolve o id da avaliação. */
    long avaliacaoDeCliente(int nota,String comentario) throws Exception {
        mvc.perform(post("/pedidos").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(pedido(1,"pedido-feedback-"+nota+comentario.length()))).andExpect(status().isCreated());
        var r=mvc.perform(put("/avaliacoes/"+produtoId).with(user("cliente@teste.local")).with(csrf()).contentType("application/json")
            .content("{\"nota\":"+nota+",\"comentario\":\""+comentario+"\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.minha").value(true)).andReturn();
        return json.readTree(r.getResponse().getContentAsString()).get("id").asLong();
    }
    void outroCliente(){
        Usuario u=new Usuario();u.nome="Outro cliente";u.email=OUTRO;u.senhaHash="hash-nao-utilizado";usuarios.save(u);
    }
    @Test void votosUteisSaoUnicosPorClienteEBloqueiamAutoVoto() throws Exception {
        long id=avaliacaoDeCliente(5,"Excelente");outroCliente();
        String util="{\"util\":true}",naoUtil="{\"util\":false}",voto="/avaliacoes/"+id+"/voto";
        mvc.perform(put(voto).with(csrf()).contentType("application/json").content(util)).andExpect(status().isUnauthorized());
        mvc.perform(put(voto).with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(util)).andExpect(status().isForbidden());
        mvc.perform(put(voto).with(user(OUTRO)).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isBadRequest());
        mvc.perform(put("/avaliacoes/999999/voto").with(user(OUTRO)).with(csrf()).contentType("application/json").content(util)).andExpect(status().isNotFound());
        for(int i=0;i<2;i++)mvc.perform(put(voto).with(user(OUTRO)).with(csrf()).contentType("application/json").content(util))
            .andExpect(status().isOk()).andExpect(jsonPath("$.uteis").value(1)).andExpect(jsonPath("$.naoUteis").value(0)).andExpect(jsonPath("$.meuVoto").value(true));
        assertThat(jdbc.queryForObject("select count(*) from bbs_avaliacao_voto",Integer.class)).isEqualTo(1);
        mvc.perform(put(voto).with(user(OUTRO)).with(csrf()).contentType("application/json").content(naoUtil))
            .andExpect(jsonPath("$.uteis").value(0)).andExpect(jsonPath("$.naoUteis").value(1)).andExpect(jsonPath("$.meuVoto").value(false));
        mvc.perform(delete(voto).with(user(OUTRO)).with(csrf())).andExpect(status().isOk())
            .andExpect(jsonPath("$.uteis").value(0)).andExpect(jsonPath("$.naoUteis").value(0)).andExpect(jsonPath("$.meuVoto").doesNotExist());
    }
    @Test void listagemInformaVotosMinhaAvaliacaoEOrdenaPorUtilidade() throws Exception {
        long primeira=avaliacaoDeCliente(4,"Bom");outroCliente();
        Usuario terceiro=new Usuario();terceiro.nome="Terceiro";terceiro.email="terceiro@teste.local";terceiro.senhaHash="x";usuarios.save(terceiro);
        mvc.perform(post("/pedidos").with(user(OUTRO)).with(csrf()).contentType("application/json").content(pedido(1,"pedido-feedback-outro"))).andExpect(status().isCreated());
        mvc.perform(put("/avaliacoes/"+produtoId).with(user(OUTRO)).with(csrf()).contentType("application/json").content("{\"nota\":2,\"comentario\":\"Mais recente\"}")).andExpect(status().isOk());
        mvc.perform(put("/avaliacoes/"+primeira+"/voto").with(user("terceiro@teste.local")).with(csrf()).contentType("application/json").content("{\"util\":true}")).andExpect(status().isOk());
        // Padrão: mais recente primeiro. Para um visitante não há "minha" nem meuVoto.
        mvc.perform(get("/avaliacoes/"+produtoId)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].comentario").value("Mais recente")).andExpect(jsonPath("$[0].minha").value(false))
            .andExpect(jsonPath("$[1].uteis").value(1)).andExpect(jsonPath("$[1].meuVoto").doesNotExist()).andExpect(jsonPath("$[0].usuarioId").doesNotExist());
        // Mais úteis: a primeira (saldo +1) sobe; o terceiro enxerga o próprio voto.
        mvc.perform(get("/avaliacoes/"+produtoId+"?ordem=uteis").with(user("terceiro@teste.local")))
            .andExpect(jsonPath("$[0].comentario").value("Bom")).andExpect(jsonPath("$[0].meuVoto").value(true)).andExpect(jsonPath("$[0].minha").value(false));
        mvc.perform(get("/avaliacoes/"+produtoId).with(user(OUTRO))).andExpect(jsonPath("$[0].minha").value(true));
        mvc.perform(get("/avaliacoes/"+produtoId+"?ordem=aleatoria")).andExpect(status().isBadRequest());
    }
    @Test void resumoCalculaMediaETotalPorProduto() throws Exception {
        mvc.perform(get("/avaliacoes/resumo")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        avaliacaoDeCliente(5,"Excelente");outroCliente();
        mvc.perform(post("/pedidos").with(user(OUTRO)).with(csrf()).contentType("application/json").content(pedido(1,"pedido-resumo-outro"))).andExpect(status().isCreated());
        mvc.perform(put("/avaliacoes/"+produtoId).with(user(OUTRO)).with(csrf()).contentType("application/json").content("{\"nota\":2,\"comentario\":\"Regular\"}")).andExpect(status().isOk());
        mvc.perform(get("/avaliacoes/resumo")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].produtoId").value(produtoId)).andExpect(jsonPath("$[0].media").value(3.5)).andExpect(jsonPath("$[0].total").value(2));
    }
    @Test void clienteExcluiSomenteAPropriaAvaliacaoEOsVotosSaemJunto() throws Exception {
        mvc.perform(delete("/avaliacoes/"+produtoId).with(csrf())).andExpect(status().isUnauthorized());
        mvc.perform(delete("/avaliacoes/"+produtoId).with(user("cliente@teste.local")).with(csrf())).andExpect(status().isNotFound());
        long id=avaliacaoDeCliente(3,"Razoavel");outroCliente();
        mvc.perform(put("/avaliacoes/"+id+"/voto").with(user(OUTRO)).with(csrf()).contentType("application/json").content("{\"util\":true}")).andExpect(status().isOk());
        mvc.perform(delete("/avaliacoes/"+produtoId).with(user(OUTRO)).with(csrf())).andExpect(status().isNotFound());
        mvc.perform(delete("/avaliacoes/"+produtoId).with(user("cliente@teste.local"))).andExpect(status().isForbidden());
        mvc.perform(delete("/avaliacoes/"+produtoId).with(user("cliente@teste.local")).with(csrf())).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("select count(*) from bbs_avaliacao",Integer.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from bbs_avaliacao_voto",Integer.class)).isZero();
        mvc.perform(get("/avaliacoes/"+produtoId)).andExpect(jsonPath("$.length()").value(0));
    }
    @Test void moderacaoDoAdminListaFiltraERemoveAvaliacoes() throws Exception {
        long id=avaliacaoDeCliente(1,"Ofensivo");outroCliente();
        mvc.perform(put("/avaliacoes/"+id+"/voto").with(user(OUTRO)).with(csrf()).contentType("application/json").content("{\"util\":false}")).andExpect(status().isOk());
        mvc.perform(get("/admin/avaliacoes")).andExpect(status().isUnauthorized());
        mvc.perform(get("/admin/avaliacoes").with(user("cliente@teste.local").roles("CLIENTE"))).andExpect(status().isForbidden());
        var admin=user("admin@teste.local").roles("ADMIN");
        mvc.perform(get("/admin/avaliacoes").with(admin)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].produto").value("SSD teste")).andExpect(jsonPath("$[0].autor").value("Cliente"))
            .andExpect(jsonPath("$[0].naoUteis").value(1)).andExpect(jsonPath("$[0].usuarioId").doesNotExist()).andExpect(jsonPath("$[0].email").doesNotExist());
        mvc.perform(get("/admin/avaliacoes?nota=1&produtoId="+produtoId).with(admin)).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/admin/avaliacoes?nota=5").with(admin)).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/admin/avaliacoes?nota=9").with(admin)).andExpect(status().isBadRequest());
        mvc.perform(delete("/admin/avaliacoes/"+id).with(user("cliente@teste.local").roles("CLIENTE")).with(csrf())).andExpect(status().isForbidden());
        mvc.perform(delete("/admin/avaliacoes/"+id).with(admin)).andExpect(status().isForbidden()); // CSRF obrigatório
        mvc.perform(delete("/admin/avaliacoes/"+id).with(admin).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(delete("/admin/avaliacoes/"+id).with(admin).with(csrf())).andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("select count(*) from bbs_avaliacao_voto",Integer.class)).isZero();
    }
    @Test void cpfValidaDigitosENaoVazaNaResposta() throws Exception {
        String body="{\"nome\":\"Teste CPF\",\"email\":\"cpf@teste.local\",\"senha\":\"TesteSeguro123\",\"cpf\":\"111.111.111-11\"}";
        mvc.perform(post("/auth/registro").with(csrf()).contentType("application/json").content(body)).andExpect(status().isBadRequest());
        mvc.perform(post("/auth/registro").with(csrf()).contentType("application/json").content(body.replace("111.111.111-11","529.982.247-25")))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.cpf").doesNotExist());
        assertThat(usuarios.findByEmail("cpf@teste.local").orElseThrow().cpf).isEqualTo("52998224725");
    }
    @Test void relatoriosExcluemCanceladosERestringemAdmin() throws Exception {
        for(String chave:List.of("relatorio-a","relatorio-b"))mvc.perform(post("/pedidos").with(user("cliente@teste.local")).with(csrf()).contentType("application/json").content(pedido(1,chave))).andExpect(status().isCreated());
        long id=compras.findAll().get(0).id;
        mvc.perform(patch("/pedidos/"+id+"/cancelar").with(user("cliente@teste.local")).with(csrf())).andExpect(status().isOk());
        String hoje=java.time.LocalDate.now().toString();
        String path="/admin/relatorios?inicio="+hoje+"&fim="+hoje;
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(get(path).with(user("cliente@teste.local"))).andExpect(status().isForbidden());
        mvc.perform(get(path).with(user("admin@teste.local").roles("ADMIN"))).andExpect(status().isOk())
            .andExpect(jsonPath("$.pedidos").value(1)).andExpect(jsonPath("$.cancelados").value(1))
            .andExpect(jsonPath("$.valor").value(104.9)).andExpect(jsonPath("$.ticketMedio").value(104.9))
            .andExpect(jsonPath("$.produtos[0].unidades").value(1)).andExpect(jsonPath("$.produtos[0].subtotal").value(100))
            .andExpect(jsonPath("$.dias[0].pedidos").value(1));
    }
    @Test void relatoriosValidamPeriodoESemMovimento() throws Exception {
        for(String periodo:List.of("inicio=2026-09-28&fim=2026-09-01","inicio=2020-01-01&fim=2026-09-28"))
            mvc.perform(get("/admin/relatorios?"+periodo).with(user("admin@teste.local").roles("ADMIN"))).andExpect(status().isBadRequest());
        mvc.perform(get("/admin/relatorios?inicio=2001-01-01&fim=2001-01-31").with(user("admin@teste.local").roles("ADMIN")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.pedidos").value(0)).andExpect(jsonPath("$.valor").value(0)).andExpect(jsonPath("$.produtos.length()").value(0));
    }
}
