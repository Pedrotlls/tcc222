package br.com.belval.bbs;
import br.com.belval.bbs.service.FreteService;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
class FreteServiceTests {
    private final FreteService service=new FreteService();
    @Test void normalVariaPorRegiaoEQuantidade() {
        assertThat(service.calcular(new BigDecimal("100"),1,"SP","normal").valor()).isEqualByComparingTo("14.90");
        assertThat(service.calcular(new BigDecimal("100"),3,"PA","normal").valor()).isEqualByComparingTo("45.90");
    }
    @Test void expressoCustaMaisETemPrazoMenor() {
        var normal=service.calcular(new BigDecimal("100"),2,"PR","normal");
        var expresso=service.calcular(new BigDecimal("100"),2,"PR","expresso");
        assertThat(expresso.valor()).isGreaterThan(normal.valor());
        assertThat(expresso.prazoMax()).isLessThan(normal.prazoMax());
    }
    @Test void normalTemGratuidadePorValor() {
        var frete=service.calcular(new BigDecimal("3500"),4,"AM","normal");
        assertThat(frete.gratis()).isTrue();
        assertThat(frete.valor()).isEqualByComparingTo("0.00");
    }
}
