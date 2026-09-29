package br.com.belval.bbs.config;
import org.springframework.context.annotation.*;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
@Configuration
public class RecuperacaoConfig {
    @Bean(name="recoveryExecutor") public ThreadPoolTaskExecutor recoveryExecutor() {
        var executor=new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);executor.setMaxPoolSize(2);executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("bbs-recovery-");executor.initialize();return executor;
    }
}
