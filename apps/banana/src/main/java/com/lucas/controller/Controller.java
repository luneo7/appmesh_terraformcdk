package com.lucas.controller;

import com.lucas.dto.out.People;
import com.lucas.grpc.MutinyProtoServiceGrpc;
import com.lucas.service.GreetingService;
import com.lucas.service.PeopleService;
import io.quarkus.grpc.runtime.annotations.GrpcService;
import io.smallrye.mutiny.Uni;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.metrics.MetricUnits;
import org.eclipse.microprofile.metrics.annotation.Timed;
import org.eclipse.microprofile.rest.client.inject.RestClient;

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
    @ConfigProperty(name = "SERVICE_NAME", defaultValue = "banana")
    String serviceName;

    @Inject
    @RestClient
    PeopleService peopleService;

    @Inject
    @GrpcService("grpc")
    MutinyProtoServiceGrpc.MutinyProtoServiceStub grpcService;

    @Inject
    GreetingService greetingService;

    @GET
    @Produces(MediaType.TEXT_PLAIN)
    public String hello() {
        return "hello from service " + serviceName;
    }

    @GET
    @Path("greeting/{name}")
    @Produces(MediaType.TEXT_PLAIN)
    public Uni<String> greeting(@PathParam("name") String name) {
        return greetingService.greeting(name);
    }

    @GET
    @Path("people")
    @Timed(name = "people", description = "A measure of how long it takes to perform the Rest Json Call.", unit = MetricUnits.MILLISECONDS)
    public Uni<People> people() {
        return peopleService.getPeople()
                            .onItem()
                            .transform(People::fromJson);
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Path("grpc")
    @Timed(name = "grpc", description = "A measure of how long it takes to perform the GRPC Proto Call.", unit = MetricUnits.MILLISECONDS)
    public Uni<People> grpc() {
        return grpcService.getPeople(com.lucas.grpc.Empty.getDefaultInstance())
                          .onItem()
                          .transform(People::fromProto);
    }
}