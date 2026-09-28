package br.com.belval.bbs;

import br.com.belval.bbs.service.CarrinhoEventos;
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CarrinhoEventosTests {
    private final CarrinhoEventos eventos = new CarrinhoEventos();
    private final CopyOnWriteArrayList<SseEmitter> conexoes = new CopyOnWriteArrayList<>();

    CarrinhoEventosTests() {
        var clientes = new ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>>();
        clientes.put(1L, conexoes);
        ReflectionTestUtils.setField(eventos, "clientes", clientes);
    }

    @Test
    void desconexaoNaoInterrompeAvisoAOutrosDispositivos() throws IOException {
        SseEmitter fechado = mock(SseEmitter.class), ativo = mock(SseEmitter.class);
        conexoes.add(fechado); conexoes.add(ativo);
        doThrow(new IOException("Cliente desconectado")).when(fechado).send(any(SseEmitter.SseEventBuilder.class));
        assertDoesNotThrow(() -> eventos.avisar(1L));
        verify(fechado, never()).complete();
        verify(ativo).send(any(SseEmitter.SseEventBuilder.class));
        assertEquals(1, conexoes.size());
        assertSame(ativo, conexoes.get(0));
    }

    @Test
    void EmissorJaEncerradoNaoFalhaAposSalvarCarrinho() throws IOException {
        SseEmitter fechado = mock(SseEmitter.class);
        conexoes.add(fechado);
        doThrow(new IllegalStateException("AsyncContext encerrado")).when(fechado).send(any(SseEmitter.SseEventBuilder.class));
        assertDoesNotThrow(() -> eventos.avisar(1L));
        assertDoesNotThrow(() -> eventos.avisar(1L));
        verify(fechado, times(1)).send(any(SseEmitter.SseEventBuilder.class));
        verify(fechado, never()).complete();
        assertTrue(conexoes.isEmpty());
    }

    @Test
    void NovaConexaoSubstituiAntigaMesmoSeJaEncerrada() {
        SseEmitter antigo = mock(SseEmitter.class);
        conexoes.add(antigo);
        for (int i = 0; i < 4; i++) conexoes.add(mock(SseEmitter.class));
        doThrow(new IllegalStateException("AsyncContext encerrado")).when(antigo).complete();
        SseEmitter novo = assertDoesNotThrow(() -> eventos.conectar(1L));
        assertEquals(5, conexoes.size());
        assertFalse(conexoes.contains(antigo));
        assertTrue(conexoes.contains(novo));
    }
}
