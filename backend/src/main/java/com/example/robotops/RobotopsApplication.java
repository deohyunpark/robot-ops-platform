package com.example.robotops;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RobotopsApplication {

	public static void main(String[] args) {
		SpringApplication.run(RobotopsApplication.class, args);
	}

}
