package br.com.belval.bbs;
import br.com.belval.bbs.config.AdminSeeder;
import br.com.belval.bbs.model.Usuario;
import br.com.belval.bbs.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class AdminSeederTests {
    @Test void senhaCurtaDeCriacaoNaoDerrubaContaExistente(){
        var repo=mock(UsuarioRepository.class);var encoder=mock(PasswordEncoder.class);
        when(repo.findByEmail("admin@bbs.local")).thenReturn(Optional.of(new Usuario()));
        var seeder=new AdminSeeder(repo,encoder);
        ReflectionTestUtils.setField(seeder,"email","admin@bbs.local");ReflectionTestUtils.setField(seeder,"password","curta");
        assertThatCode(()->seeder.run(null)).doesNotThrowAnyException();verify(repo,never()).save(any());
    }
    @Test void primeiraContaAindaExigeSenhaValida(){
        var repo=mock(UsuarioRepository.class);var seeder=new AdminSeeder(repo,mock(PasswordEncoder.class));
        when(repo.findByEmail(anyString())).thenReturn(Optional.empty());
        ReflectionTestUtils.setField(seeder,"email","admin@bbs.local");ReflectionTestUtils.setField(seeder,"password","curta");
        assertThatThrownBy(()->seeder.run(null)).isInstanceOf(IllegalStateException.class);verify(repo,never()).save(any());
    }
}
