package com.calendar.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.Clock;

@Configuration
public class WebConfig implements WebMvcConfigurer {

  @Value("${calendar.allowed-origins:http://localhost:8080}")
  private String[] allowedOrigins;

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/**")
        .allowedOrigins(allowedOrigins)
        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .maxAge(3600);
  }

  /**
   * Centralized {@link Clock} so services can be unit-tested with a fixed
   * clock and so that "now" is consistent within a single request.
   */
  @Bean
  public Clock clock() {
    return Clock.systemUTC();
  }
}
