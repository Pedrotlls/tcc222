package br.com.belval.bbs;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:context;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver","spring.jpa.hibernate.ddl-auto=create-drop","app.admin.password="})
@org.springframework.test.context.ActiveProfiles("test")
class BbsApplicationTests {

	@Test
	void contextLoads() {
	}

}
