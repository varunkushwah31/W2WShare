package com.w2w.share.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI w2wShareOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("W2W Share API")
                        .description("Offline Encrypted Peer-to-Peer File Sharing Engine — Zero Internet Required")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("W2W Systems Engineering")
                                .url("http://localhost:8080"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0")));
    }
}
