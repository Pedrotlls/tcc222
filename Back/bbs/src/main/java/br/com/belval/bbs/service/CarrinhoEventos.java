package br.com.belval.bbs.service;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.concurrent.*;
@Service
public class CarrinhoEventos {
    private final ConcurrentMap<Long,CopyOnWriteArrayList<SseEmitter>> clientes=new ConcurrentHashMap<>();
    public SseEmitter conectar(Long id){
        SseEmitter emitter=new SseEmitter(60000L);
        var lista=clientes.computeIfAbsent(id,k->new CopyOnWriteArrayList<>());
        if(lista.size()>=5){SseEmitter antigo=lista.remove(0);antigo.complete();}
        lista.add(emitter);
        Runnable remover=()->lista.remove(emitter);
        emitter.onCompletion(remover);emitter.onTimeout(()->{remover.run();emitter.complete();});emitter.onError(e->remover.run());
        try{emitter.send(SseEmitter.event().name("carrinho").data("atualizar"));}catch(Exception e){remover.run();emitter.complete();}
        return emitter;
    }
    public void avisar(Long id){
        var lista=clientes.get(id);if(lista==null)return;
        for(SseEmitter e:lista)try{e.send(SseEmitter.event().name("carrinho").data("atualizar"));}catch(Exception ex){lista.remove(e);e.complete();}
    }
}
