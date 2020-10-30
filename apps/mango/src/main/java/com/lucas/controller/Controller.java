package com.lucas.controller;

import com.lucas.dto.People;
import com.lucas.service.GreetingService;
import com.lucas.service.PeopleService;
import io.smallrye.mutiny.Uni;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import javax.inject.Inject;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

@Path("/")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class Controller {
    @ConfigProperty(name = "SERVICE_NAME", defaultValue = "mango")
    String serviceName;

    @Inject
    GreetingService greetingService;

    @Inject
    PeopleService peopleService;

    @GET
    @Produces(MediaType.TEXT_PLAIN)
    public String hello() {
        return "hello from service " + serviceName;
    }

    @GET
    @Path("people")
    public Uni<People> people() {
        return peopleService.getPeople();
    }

    @GET
    @Path("greeting/{name}")
    @Produces(MediaType.TEXT_PLAIN)
    public Uni<String> greeting(@PathParam("name") String name) {
        return greetingService.greeting(name);
    }
}