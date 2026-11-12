package br.com.belval.bbs.service;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class CarrinhoEventos {
    private final ConcurrentMap<Long, CopyOnWriteArrayList<SseEmitter>> clientes = new ConcurrentHashMap<>();

    public SseEmitter conectar(Long id) {
        SseEmitter emitter = new SseEmitter(60000L);
        var lista = clientes.computeIfAbsent(id, k -> new CopyOnWriteArrayList<>());
        synchronized (lista) {
            if (lista.size() >= 5) encerrar(lista.remove(0));
            lista.add(emitter);
        }
        Runnable remover = () -> lista.remove(emitter);
        emitter.onCompletion(remover);
        emitter.onTimeout(() -> { remover.run(); encerrar(emitter); });
        emitter.onError(e -> remover.run());
        enviar(lista, emitter);
        return emitter;
    }

    public void avisar(Long id) {
        var lista = clientes.get(id);
        if (lista == null) return;
        for (SseEmitter emitter : lista) enviar(lista, emitter);
    }

    private void enviar(CopyOnWriteArrayList<SseEmitter> lista, SseEmitter emitter) {
        try {
            emitter.send(SseEmitter.event().name("carrinho").data("atualizar"));
        } catch (IOException | IllegalStateException ex) {
            lista.remove(emitter);
            // Após falha de escrita, o contêiner encerra a conexão. Chamar complete()
            // aqui pode lançar outra exceção e devolver 500 após o carrinho ser salvo.
        }
    }

    private void encerrar(SseEmitter emitter) {
        try {
            emitter.complete();
        } catch (IllegalStateException ex) {
            // A conexão pode ter sido encerrada pelo contêiner ao mesmo tempo.
        }
    }
}
