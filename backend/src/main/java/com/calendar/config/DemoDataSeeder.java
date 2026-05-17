package com.calendar.config;

import com.calendar.dto.EventTypeCreateRequest;
import com.calendar.service.EventTypeService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Seeds two demo event types on startup so a fresh in-memory backend has
 * something to show. Disable by setting {@code calendar.seed-demo-data=false}.
 */
@Component
@ConditionalOnProperty(name = "calendar.seed-demo-data", havingValue = "true", matchIfMissing = true)
public class DemoDataSeeder implements ApplicationRunner {

  private final EventTypeService eventTypeService;

  public DemoDataSeeder(EventTypeService eventTypeService) {
    this.eventTypeService = eventTypeService;
  }

  @Override
  public void run(ApplicationArguments args) {
    eventTypeService.create(new EventTypeCreateRequest(
        "Quick intro",
        "A 30-minute introductory chat to see if there's a fit.",
        30
    ));
    eventTypeService.create(new EventTypeCreateRequest(
        "Deep dive",
        "A focused 60-minute working session on a specific topic.",
        60
    ));
  }
}
