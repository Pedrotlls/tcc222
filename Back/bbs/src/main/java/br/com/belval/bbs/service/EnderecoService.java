package br.com.belval.bbs.service;
import br.com.belval.bbs.model.*;
import br.com.belval.bbs.repository.UsuarioRepository;
import jakarta.persistence.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service
public class EnderecoService {
    private final UsuarioRepository usuarios;
    @PersistenceContext private EntityManager em;
    public EnderecoService(UsuarioRepository usuarios) { this.usuarios=usuarios; }
    public record Dados(String apelido,String cep,String rua,String numero,String complemento,String bairro,String cidade,String uf,boolean principal) {}
    private Usuario dono(String email, boolean lock) {
        Usuario u=usuarios.findByEmail(email).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        return lock?em.find(Usuario.class,u.id,LockModeType.PESSIMISTIC_WRITE):u;
    }
    private List<EnderecoSalvo> listar(Long usuarioId) {
        return em.createQuery("select e from EnderecoSalvo e where e.usuarioId=:id order by e.principal desc,e.id",EnderecoSalvo.class)
            .setParameter("id",usuarioId).getResultList();
    }
    @Transactional(readOnly=true) public List<EnderecoSalvo> listar(String email) { return listar(dono(email,false).id); }
    public EnderecoSalvo obter(Long id,Long usuarioId) {
        EnderecoSalvo e=em.find(EnderecoSalvo.class,id);
        if(e==null || !e.usuarioId.equals(usuarioId)) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Endereco nao encontrado.");
        return e;
    }
    @Transactional public EnderecoSalvo salvar(String email,Long id,Dados d) {
        Usuario u=dono(email,true);
        List<EnderecoSalvo> lista=listar(u.id);
        EnderecoSalvo e=id==null?new EnderecoSalvo():obter(id,u.id);
        if(id==null && lista.size()>=10) throw erro("Voce pode salvar ate 10 enderecos.");
        if(d==null) throw erro("Informe o endereco.");
        e.apelido=texto(d.apelido(),2,40,"apelido");
        e.cep=Objects.toString(d.cep(),"").replaceAll("[\\s-]","");
        if(!e.cep.matches("[0-9]{8}")) throw erro("CEP deve ter 8 digitos.");
        e.rua=texto(d.rua(),2,120,"rua");e.numero=texto(d.numero(),1,20,"numero");
        e.bairro=texto(d.bairro(),2,80,"bairro");e.cidade=texto(d.cidade(),2,80,"cidade");
        e.complemento=Objects.toString(d.complemento(),"").trim();
        if(e.complemento.length()>100) throw erro("Complemento deve ter ate 100 caracteres.");
        e.uf=Objects.toString(d.uf(),"").trim().toUpperCase(Locale.ROOT);
        if(!Set.of("AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO").contains(e.uf)) throw erro("Informe uma UF valida.");
        e.usuarioId=u.id;
        // A primeira entrega é principal. Só se troca a principal escolhendo outra.
        boolean seraPrincipal=lista.isEmpty() || d.principal() || e.principal;
        if(seraPrincipal) {
            lista.stream().filter(outro->!Objects.equals(outro.id,e.id)).forEach(outro->outro.principal=false);
            em.flush(); // Libera o índice único antes de promover o novo endereço.
        }
        e.principal=seraPrincipal;
        if(id==null) em.persist(e);
        return e;
    }
    @Transactional public void excluir(String email,Long id) {
        Usuario u=dono(email,true);EnderecoSalvo e=obter(id,u.id);boolean principal=e.principal;
        em.remove(e);em.flush();
        if(principal) listar(u.id).stream().findFirst().ifPresent(outro->outro.principal=true);
    }
    private String texto(String s,int min,int max,String campo) {
        if(s==null || s.trim().length()<min || s.trim().length()>max) throw erro("Confira o campo "+campo+" ("+min+" a "+max+" caracteres).");
        return s.trim();
    }
    private ResponseStatusException erro(String s) {return new ResponseStatusException(HttpStatus.BAD_REQUEST,s);}
}
